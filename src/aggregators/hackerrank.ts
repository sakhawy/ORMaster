// TODO: Refresh the cache when cookie expires

import axios, { AxiosInstance } from 'axios';
import cheerio from 'cheerio';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import IAggregator, { IChallenge } from './base';
import configManager from '../config/configManager';
import { EXTENSION_HOME_PATH } from '../constants';

export default class HackerRank implements IAggregator {
    handle: string;
    challengesUrl: string;
    cookie: string;
    axiosClient: AxiosInstance;
    challengeUrl: string;

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
            return fs.readJSONSync(challengesPath)
        }
        return await this._listChallenges()
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
        const challenges: IChallenge[] = res.data['models'].map((challenge: any) => {
            return {
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

    submitChallenge = (challenge_slug?: string, data?: any) => {
        var csrf_token: string = ''
        axios.get(
            `https://www.hackerrank.com/challenges/${challenge_slug}/problem`,
            {
                headers: {
                    Cookie: this.cookie,
                    "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0",
                }
            }
        ).then(
            (response) => {
                // parse the CSRF token
                const $ = cheerio.load(response.data)
                csrf_token = $('meta[name="csrf-token"]').attr('content') || ""
                
                axios.post(
                    `https://www.hackerrank.com/rest/contests/master/challenges/${challenge_slug}/submissions`,
                    {"code": data,"language":"db2","contest_slug":"master","playlist_slug":""},
                    {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0",
                            "X-CSRF-Token": csrf_token,
                            "Cookie": this.cookie
                        }
                    }
                ).then(
                    (response: any) => {
                        const id = response.data.model.id
                        const submission_url = `https://www.hackerrank.com/rest/contests/master/challenges/${challenge_slug}/submissions/${id}`

                        axios.get(
                            submission_url,
                            {
                                headers: {
                                    "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0",
                                    // "X-CSRF-Token": csrf_token,
                                    "Cookie": this.cookie
                                }
                            }
                        ).then(
                            (response: any) => {
                                var status = response.data.model.status
                                // send a request every 5 seconds to check the status
                                const interval = setInterval(
                                    () => {
                                        axios.get(
                                            submission_url,
                                            {
                                                headers: {
                                                    "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0",
                                                    // "X-CSRF-Token": csrf_token,
                                                    "Cookie": this.cookie
                                                }
                                            }
                                        ).then(
                                            (response: any) => {
                                                status = response.data.model.status
                                                // stop the interval if the status is not in queue
                                                if (status != "Processing") {
                                                    clearInterval(interval)
                                                    console.log(response.data)
                                                }
                                            }
                                        )
                                    }, 5000
                                )

                            }
                        )
                    }
                        
                )
            }
        )
    }
}
