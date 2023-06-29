
export interface IChallenge {
    slug: string;
    title: string;
    difficulty: string;
    url: string;
}

export default interface IAggregator {
    handle: string;
    challengesUrl: string;
    cookie: string;

    /**
   * @description Lists the challenges of the aggregator. 
   * @returns A list of key:value pairs (`challenge title`: `challenge url`).
   */
    list_challenges: () => Promise<IChallenge[]>;

    /**
    * @description Returns the data of a given challenge.
    * @param challenge_url The url of the challenge.
    * @returns The data of the challenge.
    */
    get_challenge: (challenge_url: string) => any;

    /**
    * @description Submits a challenge to the aggregator.
    * @param challenge_url The url of the challenge.
    * @param data The data of the challenge.
    * @returns The result of the submission.
    */
    submit_challenge: (challenge_url: string, data: any) => any;
}
