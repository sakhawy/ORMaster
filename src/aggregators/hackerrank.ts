import axios, { AxiosInstance } from 'axios';
import cheerio from 'cheerio';
import * as vscode from 'vscode';
import IAggregator, { IChallenge } from './base';
import configManager from '../config/configManager';

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

    listChallenges = async () => {
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
        
        return challenges
    }

    getChallenge = async (challenge_url: string) => {
        const res = await this.axiosClient.get(challenge_url);

        // get the html of the problem statement
        const $ = cheerio.load(res.data);
        const html = $('.problem-statement').html();

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
