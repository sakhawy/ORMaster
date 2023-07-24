# ORMaster - Solving SQL challenges w/ web frameworks ORM

<p align="center">
  <img src="./media/ORMaster.png" alt="" width="250">
</p>

## Overview

ORMaster is a Visual Studio Code extension designed to enhance the process of learning web frameworks (e.g., Django) Object-Relational Mapping (ORM), through solving SQL challenges. The extension pulls challenges from different providers (e.g., HackerRank), and, instead of using raw SQL queries, ORM queries can be used.

## Usage

1. Login to your preferred provider (currently, HackerRank).
    1. (Optional) Create a new HackerRank account
    2. Get the cookie value from your browser 

        ![HackerRank cookie](./docs/resources/hackerrank_cookie.png)

    3. Use the command palette (Ctrl+Shift+P) and search for "ORMaster: Login to HackerRank"

        ![Cookie login](./docs/resources/login_to_hr_with_cookie.png)

2. Choose any challenge from the list of challenges and press on the "Solve" button. 
    ![Challenge preview](./docs/resources/challenge_preview.png)


3. Write the solution to the given problem in `get_queryset` function. Press on the "Submit challenge" link that's above the `get_queryset` function to submit your solution to the provider for evaluation.

    ![Code submission](./docs/resources/code_submission.png)
    ![Accepted submission](./docs/resources/accepted_submission.png)

## Supported Providers

- HackerRank

## Supported Web Frameworks

- Django

## TODO

- Add support for more web frameworks (e.g., Laravel).
- Add support for more providers (e.g., LeetCode).
