
export interface IChallenge {
    id: string
    slug: string;
    title: string;
    difficulty: string;
    url: string;
}

export interface IAggregator {
    handle: string;
    challengesUrl: string;
    cookie: string;

    /**
   * @description Lists the challenges of the aggregator. 
   * @returns A list of key:value pairs (`challenge title`: `challenge url`).
   */
    listChallenges: () => Promise<IChallenge[]>;

    /**
    * @description Returns the data of a given challenge.
    * @param challenge_url The url of the challenge.
    * @returns The data of the challenge.
    */
    getChallenge: (challenge: IChallenge) => any;

    /**
    * @description Submits a challenge to the aggregator.
    * @param challenge_url The url of the challenge.
    * @param data The data of the challenge.
    * @returns The result of the submission.
    */
    submitChallenge: (challenge: IChallenge, data: any) => any;
}

export enum HackerRankResponseEnum {
    ACCEPTED = "Accepted",
    WRONG_ANSWER = "Wrong Answer",
}

export interface IHackerRankTestCase {
    stdin: string
    expectedOutput: string
}

export interface IHackerRankResponse {
    status: HackerRankResponseEnum 
    testcases?: IHackerRankTestCase[]
}
