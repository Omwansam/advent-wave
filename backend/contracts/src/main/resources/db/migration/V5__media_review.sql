-- What a human needs to see about a transcode — RFC 0001 (contracts/rfcs/0001-admin-portal.md).
--
-- Additive only: a defaulted column and a nullable one, so every existing row stays valid and
-- no reader of media_items changes.

-- ADDED: the worker's review flags from the last `completed` message (contracts/kafka/
-- audio.transcode.v1: lossy_master, long_leading_silence, long_trailing_silence). Until now
-- TranscodeCompletedHandler dropped them, so a lossy master or a minute of dead air reached
-- listeners with nobody told. They are for the admin portal's review queue: flags never block
-- publication, and the audio rules forbid fixing them automatically (plan §11.1, §11.7).
-- Written by the completed consumer, replaced on every completed run, cleared when a new
-- transcode is requested. An array rather than a join table: the set is small, closed, read
-- whole and written whole, always with the item.
ALTER TABLE media_items ADD COLUMN review_flags TEXT[] NOT NULL DEFAULT '{}';

-- ADDED: why the last transcode failed, as the worker's error message and stage. markFailed
-- only logged it before, so the admin portal could show 'failed' and nothing an operator could
-- act on. NULL unless status is 'failed'; cleared when outputs are stored or a new transcode is
-- requested. Not a CHECK against status: a retry moves the item to 'processing' first and
-- clears this in the same write.
ALTER TABLE media_items ADD COLUMN failure_reason TEXT;
