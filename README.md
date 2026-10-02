# learn

## LINE OA Partner Desk (mockup)

`line-oa-mockup/` holds an interactive mockup (`index.html`), production rich menu images and JSON, and a deploy script of a LINE Official Account for insurance partners (brokers, agents, dealers). Open it in a browser.

- Rich Menu, large size 2500×1686, 6 areas: premium check, renewals due this month/next month, policy copy request, payment/credit limit status, partner profile, contact staff
- Pre-verification Rich Menu (2500×843) that switches to the main menu after the partner verifies
- Sample Flex Message replies for each button (all data is fictional)
- Spec for developers: area bounds, action types, and the Rich Menu JSON

## Open in a browser

`preview/` holds standalone copies of both mockups (full HTML documents with local fonts) that any static host can serve. Rebuild them after editing a mockup with `python3 tools/build_preview.py`.

- Landing page: https://raw.githack.com/narongdechpas-coder/learn/claude/modest-edison-yw1kxf/preview/index.html
- LINE OA: https://raw.githack.com/narongdechpas-coder/learn/claude/modest-edison-yw1kxf/preview/line-oa.html (opens full screen on phones; add `#phone` to force it on desktop)
- Backoffice: https://raw.githack.com/narongdechpas-coder/learn/claude/modest-edison-yw1kxf/preview/backoffice.html
