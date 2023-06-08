import axios from 'axios';
import cheerio from 'cheerio';

import IAggregator from './base';

const HACKERRANK_COOKIE = process.env.HACKERRANK_COOKIE || "";
const HACKERRANK_URL = "https://www.hackerrank.com/rest/contests/master/tracks/sql/challenges"

class HackerRank implements IAggregator {
    name: string;
    base_url: string;
    cookie: string;
    axios_client: any;
    challenge_base_url: string;

    constructor(name: string, base_url: string, cookie: string) {
        this.name = name;
        this.base_url = base_url;
        this.cookie = cookie;
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
            HACKERRANK_URL
        )

        // reformat
        const data = res.data['models'].map((challenge: any) => {
            return {
                title: challenge.name,
                url: `${this.challenge_base_url}${challenge.slug}`
            }
        });
        
        return data
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
