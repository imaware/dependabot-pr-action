# 📦 Dependabot Pull Request Action

A GitHub Action to automatically label, approve, and merge pull requests made by Dependabot. This was built because the auto-merge feature was removed when Dependabot became a native-GitHub feature.

This is a fork of [koj-co/dependabot-pr-action](https://github.com/koj-co/dependabot-pr-action)

## ⭐ Get started

You can run this workflow, for example, once every hour:

```yaml
name: Auto-merge minor/patch
on:
  schedule:
    - cron: "0 * * * *"
jobs:
  test:
    name: Auto-merge minor and patch updates
    runs-on: ubuntu-18.04
    steps:
      - uses: imaware/dependabot-pr-action@master
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          merge-minor: true
          merge-patch: true
          merge-method: squash
```

### Inputs

#### `token` (required)

Your GitHub token, usually `{{ secrets.GITHUB_TOKEN }}` or a personal access token if you have a bot account.

#### Optional inputs

Refer to [original docs](https://github.com/koj-co/dependabot-pr-action/tree/5e108773a2d1349990cf50fc22494e12e3d3ed6e#optional-inputs)

New features is `merge-method` which allows for the action to `merge`, `rebase`, or `squash`. The default is `rebase`

## 📄 License

- Code: [MIT](./LICENSE) © [Koj](https://koj.co)
- "GitHub" is a trademark of GitHub, Inc.


