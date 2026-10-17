# Tests

Headless Playwright runs against a mocked `window.claude` (db, user, sample). They need real-shaped data:

    # 1. save a fixture from the live desk (ArtifactData tool, out_dir = tests/fixtures)
    #    collections: clients, tasks   ->  tests/fixtures/clients/*.json, tests/fixtures/tasks/*.json
    # 2. run
    cd tests && node partner-focus.test.js      # Focus picker, handled-by-someone-else, "posted today", Panda's view
    node plain-posts.test.js                    # plain "Post reel" tasks, festival rule, inspiration
    node team-page.test.js                      # add / rename / role / remove staff
    node team-features.test.js                  # who-does-what, hours, time off, who finished what
    node new-clients.test.js                    # New clients page

Each prints PASS/FAIL lines and finishes with `errors: none | fails: 0`. Screenshots land in tests/out/.
`FIXTURES=/path` overrides the fixture folder. The fixture holds real client data: do not commit it (it is git-ignored).
