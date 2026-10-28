# Event operations

The project dashboard loads event metadata first. Selecting an event fetches its registrations in pages of 100, with search, sorting and warning filters applied on the server. Summary figures always cover the entire event. Open check-in screens refresh every five seconds and on window focus; unchanged revisions return HTTP 304. Hidden tabs pause polling.

Check-in search matches words in any order and ignores Romanian diacritics, including older cedilla spellings and decomposed Unicode from imports. For example, both `stefan tiriac` and `tiriac stefan` find `Ștefan Țiriac`. Every search word must match the participant's name, email or phone. Stored names and their displayed spelling remain unchanged.

After results are stable for 250 ms, the visible Enter shortcut opens confirmation for a single match or opens Add participant when the filtered list is empty. Pending or failed server searches cannot activate the shortcut.

## Capacity and simultaneous changes

A reservation uses one place for the named participant plus one for each companion. All non-cancelled registrations reserve these places, including those marked absent. Signup, CSV import, check-in, group changes and walk-ins share the same collection hook. A manager can exceed a shift's capacity only by providing a reason, which is included in the activity history.

Each mutation acquires a short event lease and increments its revision. Registration versions reject outdated saves, including changes committed after Payload read the original document. The lease serializes capacity checks across processes and devices; it expires after 30 seconds if a process exits. Payload request transactions and MongoDB sessions are threaded through capacity reads, writes and activity entries when the adapter supports transactions. A MongoDB replica set is required for atomic rollback across documents; standalone MongoDB uses the lease but cannot provide cross-document rollback.

Bulk imports keep independent row transactions and cache slot counts and open-shift checks while the committed event token is unchanged. A concurrent writer invalidates that cache. Rows that fail remain in the import error report; previously committed rows remain saved.

## Shifts and history

Check-in defaults to the current timed shift or the next configured shift. A selected shift shows arrivals, people still expected, reserved places and available capacity. Managers assign volunteers from the event check-in team; assigned volunteers can edit the handover note. Empty assignments allow the event team to prepare the note. Conflicting note edits require a refresh.

Managers open **Acțiuni → Istoric și anulare modificări** to review changes and undo the latest change to a registration. Undo requires a reason and appends another entry. Later changes prevent undoing an older entry. Closed shifts must be reopened before changing their registrations. Direct hard deletion is disabled to preserve payment and activity history.

## Reconciliation

**Închide tura** records an immutable snapshot of donations, separately recorded consumption, combined total, people present, the counted/verified amount, and the difference. Enter one verified total across all payment methods. A difference requires an explanation. Records with unknown historical consumption require explicit acknowledgement and a note; no consumption is inferred or backfilled. Money is accumulated in integer bani and exports retain two decimal places.

Closing blocks registration changes for the shift. Reopening requires a manager and a reason and retains the original closing. Closing CSV exports remain available from the historical closing identifiers. The donation metrics continue to sum donations only.

New collections are `event-activity`, `event-shifts` and `event-closings`; Payload types include them. MongoDB schema fields and indexes are declared in the collection configs. Existing registrations gain versions and handling metadata when next saved; historical age and consumption remain unspecified. Existing email triggers are preserved.

## Verification boundary

Focused service and HTTP tests cover capacity, stale versions, leases, audit snapshots, bulk query scaling, private pagination, closing/reopening and undo. Browser fixtures cover desktop and narrow mobile layouts, payment flows, server pagination, automatic refresh and two devices submitting the same version. These use controlled database/API doubles. No production database, isolated MongoDB concurrency benchmark, production build or deployment is exercised by those fixtures.
