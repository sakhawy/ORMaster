import axios from 'axios';
import cheerio from 'cheerio';

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

    submit_challenge = (challenge_url: string, data: any) => {
        return {};
    }
}
