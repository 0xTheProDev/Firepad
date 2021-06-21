# Contributing | Firepad

Thank you for contributing to the Firebase community!

- [Have a usage question?](#question)
- [Think you found a bug?](#issue)
- [Have a feature request?](#feature)
- [Want to submit a pull request?](#submit)
- [Need to get set up locally?](#local-setup)

## <a name="question"></a>Have a usage question?

We get lots of those and we love helping you, but GitHub is not the best place for them. Issues
which just ask about usage will be closed. Here are some resources to get help:

- Go through the [documentation](https://firepad.io/docs/)
- Try out some [examples](../examples/README.md)

If the official documentation doesn't help, try asking a question on the
[Firebase Google Group](https://groups.google.com/forum/#!forum/firebase-talk) or one of our
other [official support channels](https://firebase.google.com/support/).

**Please avoid double posting across multiple channels!**

## <a name="issue"></a>Think you found a bug?

Yeah, we're definitely not perfect!

Search through [old issues](https://github.com/interviewstreet/firepad-x/issues) before submitting a new
issue as your question may have already been answered.

If your issue appears to be a bug, and hasn't been reported,
[open a new issue](https://github.com/interviewstreet/firepad-x/issues/new). Please use the provided bug
report template and include a minimal repro.

If you are up to the challenge, [submit a pull request](#submit) with a fix!

## <a name="feature"></a>Have a feature request?

Great, we love hearing how we can improve our products! After making sure someone hasn't already
requested the feature in the [existing issues](https://github.com/interviewstreet/firepad-x/issues), go
ahead and [open a new issue](https://github.com/interviewstreet/firepad-x/issues/new). Feel free to remove
the bug report template and instead provide an explanation of your feature request. Provide code
samples if applicable. Try to think about what it will allow you to do that you can't do today? How
will it make current workarounds straightforward? What potential bugs and edge cases does it help to
avoid?

## <a name="submit"></a>Want to submit a pull request?

Sweet, we'd love to accept your contribution! [Open a new pull request](https://github.com/interviewstreet/firepad-x/pull/new/master)
and fill out the provided form.

**If you want to implement a new feature, please open an issue with a proposal first so that we can
figure out if the feature makes sense and how it will work.**

Make sure your changes pass our linter and the tests all pass on your local machine. We've hooked
up this repo with continuous integration to double check those things for you.

Most non-trivial changes should include some extra test coverage. If you aren't sure how to add
tests, feel free to submit regardless and ask us for some advice.

## <a name="local-setup"></a>Need to get set up locally?

If you'd like to contribute to Firepad, you'll need to do the following to get your environment set up.

### Install Dependencies

```bash
$ git clone https://github.com/interviewstreet/firepad-x.git
$ cd firepad                                                  # go to the firepad directory

$ npm install -g yarn                                         # install yarn globally

$ yarn                                                        # install local npm build / test dependencies
```

### Start Dev Server

```bash
$ cp configs/firebase.sample.json configs/firebase.json       # copy dummy config file

$ vi configs/firebase.json                                    # update configuration

$ yarn start                                                  # start webpack server
```

### Lint, Build, and Test

```bash
$ yarn lint                                                   # run prettier

$ yarn test                                                   # run jest test suites

$ yarn build                                                  # produces output bundles
```

### Output Directories

1. `dist` - Single chunk bundle to directly use in Browser in a `<script>` tag, or require in Node using `commonjs`.
2. `esm` - ES compatible modules for modern Frontend application development, to be required using `import` keyword.
3. `types` - Type declaration files for type support and documentation.
