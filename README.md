[![make.fun](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123)
[![Rank](https://make.fun/badge/news-image-20261123/suchonamehzabin8-maker/news-image-20261123/rank.svg)](https://make.fun/bounty/news-image-20261123)
[![Reward](https://make.fun/badge/news-image-20261123/suchonamehzabin8-maker/news-image-20261123/reward.svg)](https://make.fun/bounty/news-image-20261123)

# The World Today — 23 November 2026

A program that draws one newspaper front page summing up the world news of
Monday 23 November 2026, and writes it to `/output/entry.png`.

## The day's news

- **COP31 ends with no deal** — nearly 200 nations leave Antalya without a
  cover decision after the longest climate summit on record; the EU and about
  130 countries rejected a text with no fossil-fuel phase-out.
- **Russian missiles enter Poland** — Poland calls emergency NATO talks after
  three cruise missiles cross its border.
- **Kyiv region in mourning** — a Russian drone strike wrecks a five-storey
  block in Dymer: five dead, nine feared under the rubble.
- **Democrats take 258 House seats** — the largest US House majority since 1992.
- **Nepal PM in Delhi** — Balendra Shah's first trip abroad: deals signed, a
  new Ayodhya–Janakpur train link, and $1.62bn in Indian flood aid.
- **Garment wage standoff in Bangladesh** — makers offer about 15% as workers
  demand 30,000 taka a month; unrest shuts dozens of factories near Dhaka.
- **Factory fire in Indonesia** — a blaze at a sweets factory in Serang kills
  three workers; at least 36 are still missing.

## How it works

`main.ts` (Node 22, standard library only) draws the whole front page with a
hand-written canvas: a 5x7 bitmap font, simple vector pictograms (globe,
factory, shield, capitol dome), and a hand-written PNG encoder (zlib for
compression, hand-rolled CRC32). No network, no randomness, no time input —
two runs write byte-identical files.

Run it:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built for the [news-image-20261123](https://make.fun/bounty/news-image-20261123)
bounty on [make.fun](https://make.fun).
