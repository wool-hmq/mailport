# User Instruction Memory

This file records user instructions, preferences, and teachings for reference in future interactions.

## Format

### User Instruction Entry
User instruction entries should follow this format:

[User Instruction Summary]
- Date: [YYYY-MM-DD]
- Context: [Mentioned scenario or time]
- Instructions:
  - [Content of user teaching or instruction, described line by line]

## Deduplication Strategy
- Before adding a new entry, check for similar or identical instructions.
- If a duplicate is found, skip the new entry or merge it with the existing one.

## Entries

[User Instruction Summary]
- Date: 2026-10-07
- Context: MailPort feature implementation (HTTP API sender + Outlook/Gmail OAuth)
- Instructions:
  - Do not deliberate at length before acting; start editing files directly ("开始改文件，别在那思考了").
  - Do not smoke-test routine changes. Only test when a change is genuinely large
    (a refactor, adding a lot of features at once) or when the user reports a
    deployment problem that needs reproducing ("除非真的非常大的改动...不然不需要测试").
  - When the user is unfamiliar with a feature (e.g. HTTP APIs), write detailed beginner-friendly docs under doc/ for it.
