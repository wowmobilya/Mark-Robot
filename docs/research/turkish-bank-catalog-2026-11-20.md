# Turkish bank directory — 20 November 2026

## Scope and counts

`currency-bank-catalog.js` contains **67 unique bank entities** for the manual
exchange-source picker. Directory inclusion does not imply a public exchange
board, an available FX API, retail services, or a recommendation to use a bank.
The central bank and exchange offices remain separate source types.

| Picker category | Entries | Reconciliation |
| --- | ---: | --- |
| Deposit | 36 | BDDK's 35 deposit banks plus separately listed Birleşik Fon Bankası |
| Participation | 11 | BDDK's 10 participation banks plus licensed TKBB member İktisat Katılım |
| Development and investment | 20 | BDDK's current development/investment list |
| Total | 67 | Each legal bank appears once |

The six banks explicitly marked digital in the BDDK list remain in their
underlying category: Colendi, FUPS and Ziraat Dinamik are deposit banks; Adil
Katılım, Hayat Finans and TOM Bank are participation banks. Enpara is included
as a deposit bank; a branchless service alone is not used to infer BDDK's
specific digital-bank designation.

## Primary directories

- [BDDK bank directory](https://www.bddk.org.tr/Kurulus/Liste/90): official names,
  classifications, digital flags and linked official websites. It lists 35
  deposit banks, 20 development/investment banks, 10 participation banks and
  Birleşik Fon separately under the SDIF-managed category.
- [TBB bank website directory](https://www.tbb.org.tr/banka-ve-sektor-bilgileri/banka-bilgileri/bankalar/internet-adresleri):
  secondary official cross-check of deposit/development names and website
  targets, including the Turkish sites of foreign bank branches.
- [TKBB members](https://www.tkbb.org.tr/): all 11 current participation-bank
  members, including İktisat Katılım.

BDDK's directory lag for İktisat is reconciled with its own [operating-licence
decision 11424, dated 26 February 2026](https://www.bddk.org.tr/Duyuru/Detay/2278)
and TKBB's current membership. The bank's [official site](https://iktisatkatilim.com.tr/)
confirms the legal name and operating entity. İktisat is therefore included;
the directory count is not treated as an exhaustive current total on its own.

## Fund-managed banks

Birleşik Fon is included because BDDK still lists it as a bank, with its own
official website. The picker groups it under deposit for navigation but retains
`registryCategory: 'sdif'` and `status: 'sdif-management'`. Its inclusion does
not assert that it supplies retail quotes.

Adil Katılım remains in participation. [BDDK decision 11601, dated 17 November
2026](https://www.bddk.org.tr/Duyuru/Detay/4321) transfers management, supervision
and shareholder rights other than dividends to TMSF; this decision is not
described as operating-licence withdrawal. The entry carries the same visible
fund-management status, decision date and source URL. Review this status when
the directory is next refreshed.

## Name changes and exclusions

- Turkish Bank appears once under **Freedom Bank**. The [KAP name-change
  disclosure](https://www.kap.org.tr/tr/Bildirim/1654760) records registration
  on 17 August 2026. The old name is a search alias, not another bank.
- Rabobank appears once under **Hepsi Bank**. The [bank's own corporate
  history](https://www.hepsibank.com.tr/tr/about-rabobank/rabobank-as.aspx)
  records the July 2026 ownership/title change. BDDK's current `hepsibank.com.tr`
  target is used instead of TBB's legacy Rabobank link. Rabobank is a search
  alias only.
- **Golden Global** is excluded following [BDDK decision 11593, dated
  4 November 2026](https://www.bddk.org.tr/Duyuru/Detay/4320), withdrawing its
  operating licence.
- **Bank Mellat's Istanbul branch** is excluded following [BDDK decision
  11572, dated 18 September 2026](https://www.bddk.org.tr/Duyuru/Detay/3304),
  withdrawing its operating licence.
- Establishment permission alone is insufficient for inclusion as an operating
  bank. Fuzul Katılım and Halk Katılım are not in the current operating/member
  lists reviewed. BDDK's [announcements](https://www.bddk.org.tr/Home/ShowAll_Duyuru?metin=1)
  distinguish their establishment permissions from operating permissions.
- Separate digital service brands are not added as independent banks. The
  Turkish office named Mizan is not equated with a similarly named foreign bank.

## Website and rate-board handling

Every website hostname comes from BDDK or TBB, except İktisat's separately
confirmed official site. Registry links beginning with HTTP are upgraded to
HTTPS to satisfy the application's external-link policy. This does not imply
that every host's current TLS or page availability has been individually
tested. URLs are official website references, not guessed data endpoints.

The following existing source IDs and directly checked rate-board pages are
preserved:

| ID | Verified official board |
| --- | --- |
| `ziraat` | [Ziraat prices and rates](https://www.ziraatbank.com.tr/tr/fiyatlar-ve-oranlar) |
| `isbank` | [İşbank exchange rates](https://www.isbank.com.tr/doviz-kurlari) |
| `garanti` | [Garanti BBVA exchange rates](https://www.garantibbva.com.tr/tr/doviz-kurlari) |

Other banks have an official-site link and no `rateUrl` claim. All banks remain
manual-only; adding a directory entry must never enable fetching, scraping or
reference-rate fallback in that bank's name. Users must enter both USD and EUR
from the same buy/sell column of an actual quote.

## Labels and maintenance

Arabic, English, Turkish, French and Russian labels translate bank/category
terms while preserving recognizable brand names. `officialName` keeps the
registry's legal title, and stable ASCII IDs are independent of display names.
Former brand names are retained as aliases where relevant.

Refresh by reconciling all three directories with BDDK's latest operating
licence and withdrawal decisions. A name change updates the current entry and
adds an alias; it does not create a duplicate source or modify saved rates.
