import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { mockApi, mockPrints } from './helpers.js';
import { formatLegalDate } from '../src/lib/legality.js';
import { sortByReleaseDate, legalToPlayDate } from '../src/lib/upcoming.js';

// These tests derive their expectations from the bundled upcoming-sets.json rather than
// hard-coding set names: entries age out of that file once a set releases, so anything
// pinned to a specific set would rot. We read the same data the app bundles and assert
// the rendering/behaviour contract against whatever is currently in it.
const require = createRequire(import.meta.url);
const upcomingSets = sortByReleaseDate(require('../src/data/upcoming-sets.json'));

// Not every upcoming set has its set code known yet (setCode stays null until the code is
// found), so pick the first entry that has one the parser can read back off a deck line.
// Codes are alphanumeric and may start with a digit ("30C"), matching parser.js CARD_RE.
const codeableSet = upcomingSets.find((s) => /^[A-Za-z0-9-]{2,10}$/.test(s.setCode ?? ''));
const specialSet = upcomingSets.find((s) => s.isSpecialSet);
const prereleaseSet = upcomingSets.find((s) => s.prereleaseDate);
// Earliest date any set stops being 'announced'.
const earliestActivation = upcomingSets
  .map((s) => s.prereleaseDate ?? s.releaseDate)
  .filter(Boolean)
  .sort()[0];

async function loadDeck(page, decklist) {
  await page.getByRole('textbox', { name: /paste/i }).fill(decklist);
  await page.getByRole('button', { name: /load deck/i }).click();
}

test.describe('Upcoming sets section (landing page)', () => {
  test.skip(upcomingSets.length === 0, 'no upcoming sets in the bundled data');

  test('lists each upcoming set with its release date and computed legal date', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-06-15T12:00:00'));
    await page.goto('/');

    const section = page.getByRole('region', { name: /upcoming sets/i });
    await expect(section).toBeVisible();

    // Per row, not section-wide: name and series can be identical (e.g. "30th
    // Celebration"), so getByText(name) would match both and trip strict mode.
    const rows = section
      .locator("[role='row']")
      .filter({ has: page.getByTestId('set-name') });
    await expect(rows).toHaveCount(upcomingSets.length);

    for (const [i, set] of upcomingSets.entries()) {
      const row = rows.nth(i);
      await expect(row.getByTestId('set-name')).toHaveText(set.name);

      await expect(row.locator("[role='cell'][data-label='Release']")).toHaveText(
        formatLegalDate(set.releaseDate)
      );

      const legal = legalToPlayDate(set);
      await expect(row.locator("[role='cell'][data-label='Legal']")).toHaveText(
        legal ? formatLegalDate(legal) : '?'
      );
    }
  });

  test('set name links to its source URL (opens in a new tab)', async ({ page }) => {
    const first = upcomingSets.find((s) => s.sourceUrl);
    test.skip(!first, 'no upcoming set with a source URL in the bundled data');
    await page.clock.setFixedTime(new Date('2026-06-15T12:00:00'));
    await page.goto('/');

    const link = page.getByRole('link', { name: first.name });
    await expect(link).toHaveAttribute('href', first.sourceUrl);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test('special sets show "?" for the unknown legal date', async ({ page }) => {
    test.skip(!specialSet, 'no special upcoming set in the bundled data');
    await page.clock.setFixedTime(new Date('2026-06-15T12:00:00'));
    await page.goto('/');
    const section = page.getByRole('region', { name: /upcoming sets/i });
    await expect(section.getByText('?', { exact: true })).toBeVisible();
  });

  test('a set in its prerelease window shows the status pill and §4.1.3 note', async ({ page }) => {
    test.skip(!prereleaseSet, 'no set with a prerelease date in the bundled data');
    // Pin "today" to the day the prerelease window opens (inclusive).
    await page.clock.setFixedTime(new Date(`${prereleaseSet.prereleaseDate}T12:00:00`));
    await page.goto('/');

    await expect(page.getByTestId('status-prerelease').first()).toBeVisible();
    const note = page.getByTestId('reprint-note').first();
    await expect(note).toBeVisible();
    await expect(note).toContainText('§4.1.3');
  });

  test('before the prerelease window, no prerelease status or note is shown', async ({ page }) => {
    test.skip(!prereleaseSet, 'no set with a prerelease date in the bundled data');
    // The §4.1.3 note is page-level, so it stays absent only while every set is still
    // 'announced' — hence the earliest activation, not just this set's prerelease.
    const dayBefore = new Date(`${earliestActivation}T12:00:00`);
    dayBefore.setDate(dayBefore.getDate() - 1);
    await page.clock.setFixedTime(dayBefore);
    await page.goto('/');

    await expect(page.getByTestId('status-prerelease')).toHaveCount(0);
    await expect(page.getByTestId('reprint-note')).toHaveCount(0);
  });

  test('a just-released set shows "Released" status and a data-availability note', async ({ page }) => {
    test.skip(!codeableSet, 'no upcoming set with a known set code in the bundled data');
    // A few days after release (still before the legal date), the set lingers in the
    // list until the pipeline prunes it — it should read "Released", with a note that
    // card data lands within a day or two.
    const after = new Date(`${codeableSet.releaseDate}T12:00:00`);
    after.setDate(after.getDate() + 3);
    await page.clock.setFixedTime(after);
    await page.goto('/');

    await expect(page.getByTestId('status-released').first()).toBeVisible();
    await expect(page.getByTestId('reprint-note').first()).toContainText(/within a day or two/i);
  });
});

test.describe('Upcoming sets section on mobile', () => {
  test.use({ viewport: { width: 375, height: 800 } });
  test.skip(upcomingSets.length === 0, 'no upcoming sets in the bundled data');

  test('each value is labelled inline (Release / Legal / Status) when the header collapses', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date('2026-06-15T12:00:00'));
    await page.goto('/');

    const section = page.getByRole('region', { name: /upcoming sets/i });
    await expect(section).toBeVisible();

    // The narrow-screen layout swaps the shared header for per-cell labels rendered via
    // [data-label]::before. Read the generated content for the first row's cells.
    for (const label of ['Release', 'Legal', 'Status']) {
      const cell = section.locator(`[role='cell'][data-label="${label}"]`).first();
      const before = await cell.evaluate(
        (el) => getComputedStyle(el, '::before').content
      );
      expect(before).toMatch(new RegExp(label, 'i'));
    }

    // The shared column header stays in the DOM (visually hidden) so screen readers keep
    // the column semantics.
    await expect(section.getByRole('columnheader', { name: 'Release' })).toHaveCount(1);
  });
});

test.describe('Cards from upcoming sets in a pasted deck', () => {
  test('an unresolvable card from an upcoming set shows an amber "coming soon" tile', async ({ page }) => {
    test.skip(!codeableSet, 'no upcoming set with a known set code in the bundled data');
    await page.clock.setFixedTime(new Date('2026-06-15T12:00:00'));
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');

    await loadDeck(
      page,
      `Pokémon: 2\n2 Zzfakemon ${codeableSet.setCode} 199\n\nTotal Cards: 2`
    );

    const tile = page.getByTestId('coming-soon');
    await expect(tile).toBeVisible();
    await expect(tile).toContainText(codeableSet.name);
    await expect(tile).toContainText('Zzfakemon');
    // Amber informational tile, not the red error tile.
    await expect(page.locator('.card-notice')).toHaveCount(1);
    await expect(page.locator('.card-warning')).toHaveCount(0);
    await expect(page.locator('.error-card')).toHaveCount(0);
    await expect(page.getByText(/Card data not in yet · releases .* · legal/)).toBeVisible();
  });

  // #42: the broken case is a Pokémon whose NAME resolves to a print in some other set.
  // The old name-search fallback silently swapped that print in ("Darkrai ex PBL 123" →
  // "Darkrai ex SVP 110"); it must now show the amber "coming soon" tile, never an image.
  test('a Pokémon whose name resolves elsewhere but is pasted with an upcoming set code shows coming-soon (not the wrong print)', async ({ page }) => {
    test.skip(!codeableSet, 'no upcoming set with a known set code in the bundled data');
    await page.clock.setFixedTime(new Date('2026-06-15T12:00:00'));
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');

    // "Dragapult ex" IS in MOCK_PRINTS_BY_NAME, so the name search returns sv6-130 —
    // exactly the wrong substitution #42 is about.
    await loadDeck(
      page,
      `Pokémon: 2\n2 Dragapult ex ${codeableSet.setCode} 199\n\nTotal Cards: 2`
    );

    const tile = page.getByTestId('coming-soon');
    await expect(tile).toBeVisible();
    await expect(tile).toContainText(codeableSet.name);
    await expect(tile).toContainText('Dragapult ex');
    // The substituted print must NOT be rendered.
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(0);
    await expect(page.locator('.card-notice')).toHaveCount(1);
    await expect(page.locator('.card-warning')).toHaveCount(0);
    await expect(page.locator('.error-card')).toHaveCount(0);
  });

  test('an unresolvable card with an unknown (non-upcoming) set code stays a red error tile', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-06-15T12:00:00'));
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');

    await loadDeck(page, `Pokémon: 1\n1 Foo ZZZ 99\n\nTotal Cards: 1`);

    await expect(page.locator('.error-card')).toHaveCount(1);
    await expect(page.getByTestId('coming-soon')).toHaveCount(0);
    await expect(page.locator('.card-notice')).toHaveCount(0);
  });

  test('a Trainer pasted with an upcoming set code is silently swapped to a legal print', async ({ page }) => {
    // Boss's Orders pasted with an upcoming set code resolves by NAME to the legal
    // reprint (me2pt5/ASC in the mock), discarding the pasted upcoming code — no error.
    test.skip(!codeableSet, 'no upcoming set with a known set code in the bundled data');
    await page.clock.setFixedTime(new Date('2026-06-15T12:00:00'));
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');

    await loadDeck(
      page,
      `Trainer: 1\n1 Boss's Orders ${codeableSet.setCode} 250\n\nTotal Cards: 1`
    );

    await expect(page.locator('[data-testid="card-tile"] img[alt="Boss\'s Orders"]')).toBeVisible();
    await expect(page.getByTestId('coming-soon')).toHaveCount(0);
    await expect(page.locator('.error-card')).toHaveCount(0);
  });

  test('a card from a just-released set (data not in yet) shows the data-pending message', async ({ page }) => {
    test.skip(!codeableSet, 'no upcoming set with a known set code in the bundled data');
    const after = new Date(`${codeableSet.releaseDate}T12:00:00`);
    after.setDate(after.getDate() + 3);
    await page.clock.setFixedTime(after);
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');

    await loadDeck(
      page,
      `Pokémon: 2\n2 Zzfakemon ${codeableSet.setCode} 199\n\nTotal Cards: 2`
    );

    const tile = page.getByTestId('coming-soon');
    await expect(tile).toBeVisible();
    await expect(tile).toContainText(codeableSet.name);
    await expect(page.getByText(/data not in yet/i)).toBeVisible();
    await expect(page.getByText(/within a day or two/i)).toBeVisible();
    // The future-tense "Releases …" wording must not show once the set is out.
    await expect(page.getByText(/Releases /)).toHaveCount(0);
  });
});
