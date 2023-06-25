import axios from 'axios';
import cheerio from 'cheerio';
import * as fs from 'fs-extra';
import * as path from 'path';

import IAggregator, { IChallenge } from './base';

const HACKERRANK_COOKIE = process.env.HACKERRANK_COOKIE || "";
const HACKERRANK_URL = "https://www.hackerrank.com/rest/contests/master/tracks/sql/challenges"

export default class HackerRank implements IAggregator {
    name: string;
    base_url: string;
    cookie: string;
    axios_client: any;
    challenge_base_url: string;

    constructor(name?: string, base_url?: string, cookie?: string) {
        this.name = "HackerRank";
        this.base_url = HACKERRANK_URL;
        this.cookie = HACKERRANK_COOKIE;
        this.axios_client = axios.create({
            baseURL: this.base_url,
            headers: {
                Cookie: this.cookie,
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)",
            }
        })
        this.challenge_base_url = "https://www.hackerrank.com/challenges/"
    }

    list_challenges = async () => {
        // get json data
        const res = await this.axios_client.get(
            HACKERRANK_URL,
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
                url: `${this.challenge_base_url}${challenge.slug}`
            }
        });
        
        return challenges
    }

    get_challenge = async (challenge_url: string) => {
        const res = await this.axios_client.get(challenge_url);

        // get the html of the problem statement
        const $ = cheerio.load(res.data);
        const html = $('.problem-statement').html();

        return html;

    }

    submit_challenge = (challenge_url?: string, data?: any) => {
        const cookie = ""
        var csrf_token: string = ''

        axios.get(
            'https://www.hackerrank.com/challenges/select-all-sql/problem',
            {
                headers: {
                    Cookie: cookie,
                    "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0",
                }
            }
        ).then(
            (response) => {
                // parse the CSRF token
                const $ = cheerio.load(response.data)
                csrf_token = $('meta[name="csrf-token"]').attr('content') || ""
                
                axios.post(
                    'https://www.hackerrank.com/rest/contests/master/challenges/select-all-sql/submissions',
                    {"code":"\n/*\n    Enter your query here and follow these instructions:\n    1. Please append a semicolon \";\" at the end of the query and enter your query in a single line to avoid error.\n    2. The AS keyword causes errors, so follow this convention: \"Select t.Field From table1 t\" instead of \"select t.Field From table1 AS t\"\n    3. Type your code immediately after comment. Don't leave any blank line.\n*/","language":"db2","contest_slug":"master","playlist_slug":""},
                    {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0",
                            "X-CSRF-Token": csrf_token,
                            "Cookie": cookie
                        }
                    }
                ).then(
                    (response: any) => {
                        const id = response.data.model.id
                        const submission_url = `https://www.hackerrank.com/rest/contests/master/challenges/select-all-sql/submissions/${id}`

                        axios.get(
                            submission_url,
                            {
                                headers: {
                                    "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0",
                                    // "X-CSRF-Token": csrf_token,
                                    "Cookie": cookie
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
                                                    "Cookie": cookie
                                                }
                                            }
                                        ).then(
                                            (response: any) => {
                                                status = response.data.model.status
                                                console.log(status)
                                            }
                                        )
                                    }
                                )

                            }
                        )
                    }
                        
                )
            }
        )
    }
}

const hackerRank = new HackerRank()
hackerRank.submit_challenge()

