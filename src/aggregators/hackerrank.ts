// TODO: Refresh the cache when cookie expires

import axios, { AxiosInstance } from 'axios';
import cheerio from 'cheerio';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { IChallenge, IAggregator, IHackerRankResponse, IHackerRankTestCase, HackerRankResponseEnum } from './base';
import configManager from '../config/configManager';
import { EXTENSION_HOME_PATH } from '../constants';

export class HackerRank implements IAggregator {
    handle: string;
    challengesUrl: string;
    cookie: string;
    axiosClient: AxiosInstance;
    challengeUrl: string;
    challenges: IChallenge[] = [];

    constructor() {
        this.handle = "HackerRank";
        this.challengesUrl = configManager.get('challengesUrl');
        this.challengeUrl = configManager.get('challengeUrl')
        this.cookie = configManager.get('cookie');
        this.axiosClient = axios.create({
            baseURL: this.challengesUrl,
            headers: {
                Cookie: this.cookie,
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)",
            }
        })
    }

    async login(force: boolean = false): Promise<void> {
        // check the config for the cookie
        var cookie = configManager.get('cookie')
        if (cookie === '' || force) {
            cookie = await vscode.window.showInputBox({
                placeHolder: "Enter the HackerRank cookie: ",
                prompt: "Enter the HackerRank cookie",
            });
            await configManager.set('cookie', cookie)
        }
        if (cookie !== undefined) {
            this.cookie = cookie
            this.axiosClient.defaults.headers.Cookie = cookie
        }

        // reset the cached challenges 
        fs.emptyDirSync(path.join(EXTENSION_HOME_PATH, 'cache'))
    }

    cacheChallenges = async (challenges: IChallenge[]) => {
        // a directory with a json for the metadata
        // and html files from each challenge
        const cachePath = path.join(EXTENSION_HOME_PATH, 'cache')
        fs.ensureDirSync(cachePath)
        const challengesPath = path.join(cachePath, 'challenges.json')
        fs.ensureFileSync(challengesPath)
        fs.writeJSONSync(challengesPath, challenges)
    }

    cacheChallenge = async (challenge: IChallenge, challengeHTML: string | null) => {
        const cachePath = path.join(EXTENSION_HOME_PATH, 'cache')
        fs.ensureDirSync(cachePath)
        const challengePath = path.join(cachePath, `${challenge.slug}.html`)
        if (challengeHTML !== null) {
            fs.ensureFileSync(challengePath)
            fs.writeFileSync(challengePath, challengeHTML)
        }
    }

    listChallenges = async (): Promise<IChallenge[]> => {
        // check if there is a cache
        const cachePath = path.join(EXTENSION_HOME_PATH, 'cache')
        const challengesPath = path.join(cachePath, 'challenges.json')
        if (fs.existsSync(challengesPath)) {
            this.challenges = fs.readJSONSync(challengesPath)
        }
        this.challenges = await this._listChallenges()
        return this.challenges
    }

    getChallenge = async (challenge: IChallenge): Promise<string | null> => {
        // check if there is a cache
        const cachePath = path.join(EXTENSION_HOME_PATH, 'cache')
        const challengePath = path.join(cachePath, `${challenge.slug}.html`)
        if (fs.existsSync(challengePath)) {
            return fs.readFileSync(challengePath, 'utf-8')
        }
        return await this._getChallenge(challenge)
    }

    _listChallenges = async () => {
        // get json data
        const res = await this.axiosClient.get(
            this.challengesUrl,
            {
                // Quick hack, HackerRank currently has about 50 challenges.
                params: {
                    limit: 200,
                }
            }
        )

        // reformat
        const challenges: IChallenge[] = res.data.models.map((challenge: any) => {
            return {
                id: challenge.id,
                slug: challenge.slug,
                title: challenge.name,
                difficulty: challenge.difficulty_name,
                url: `${this.challengeUrl}${challenge.slug}`
            }
        });

        await this.cacheChallenges(challenges)
        
        return challenges
    }

    _getChallenge = async (challenge: IChallenge) => {
        const res = await this.axiosClient.get(challenge.url);

        // get the html of the problem statement
        const $ = cheerio.load(res.data);
        const html = $('.problem-statement').html();

        await this.cacheChallenge(challenge, html)

        return html;

    }

    // TODO: Refactor this shit
    submitChallenge = async (challenge: IChallenge, data?: any): Promise<IHackerRankResponse | null> => {
        let csrfToken: string = ''
        const problemHTML = await axios.get(
            `https://www.hackerrank.com/challenges/${challenge.slug}/problem`,
            {
                headers: {
                    Cookie: this.cookie,
                    "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0",
                }
            }
        )
        // parse the CSRF token
        const $ = cheerio.load(problemHTML.data)
        csrfToken = $('meta[name="csrf-token"]').attr('content') || ""
        try {
            let submissionHTML = await axios.post(
                `https://www.hackerrank.com/rest/contests/master/challenges/${challenge.slug}/submissions`,
                {"code": data,"language":"db2","contest_slug":"master","playlist_slug":""},
                {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0",
                        "X-CSRF-Token": csrfToken,
                        "Cookie": this.cookie
                    }
                }
            )

            const challengeId = submissionHTML.data.model.id
            const submissionUrl = `https://www.hackerrank.com/rest/contests/master/challenges/${challenge.slug}/submissions/${challengeId}`
            
            // poll the submission url until it is done
            let response: IHackerRankResponse = {
                status: HackerRankResponseEnum.ACCEPTED,
            };

            let HTMLResponse: any;
            do {
                HTMLResponse = await axios.get(
                    submissionUrl,
                    {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0",
                            "X-CSRF-Token": csrfToken,
                            "Cookie": this.cookie
                        }
                    }
                )

                await new Promise(_ => setTimeout(_, 5000));
            } while (HTMLResponse.data.model.status === "Processing")

            response.status = HTMLResponse.data.model.status

            if (response.status === HackerRankResponseEnum.ACCEPTED) {
                return response
            } else {
                // Scrape the test case expected output
                const testcaseId = HTMLResponse.data.model.testcase_message.findIndex((testcase: string) => testcase === "Wrong Answer");
                
                const url = `https://www.hackerrank.com/rest/contests/master/testcases/${challenge.id}/${testcaseId}/testcase_data`

                const testcaseHTML = await axios.get(
                    url,
                    {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0",
                            "X-CSRF-Token": csrfToken,
                            "Cookie": this.cookie
                        }
                    }
                )

                response.testcases = [
                    {
                        stdin: testcaseHTML.data.stdin,
                        expectedOutput: testcaseHTML.data.expected_output
                    },  ...(response.testcases || [])
                ]
                return response
            }


        } catch (e: any) {
            // TODO: Should reject and handle this error elsewhere
            if (e.response.status === 405) {
                // invalid cookie, login again
                await this.login(true)
            }

            return null
        }
    }
}

export const hackerrank = new HackerRank()