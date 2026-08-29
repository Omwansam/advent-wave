-- GENERATED FILE — do not edit by hand.
-- Source: src/data/mockData.js + src/data/recommendationMeta.js
-- Regenerate: node backend/tools/generate-seed.mjs
--
-- Placeholder catalogue for development. Workstream H replaces every row here with
-- church-sourced, consent-backed content in weeks 7-8; at that point this migration and
-- its generator are deleted, not amended.
--
-- Ids are UUIDv5 over a fixed namespace, so this file is stable across regenerations.

-- Contributor and licence. media_items.status = 'published' is refused by the
-- media_items_publication_gate trigger unless this licence is 'granted'.
INSERT INTO churches (id, name, country, region, contact_email, consent_status)
VALUES ('c9483745-dfe9-529f-bfec-7b69e614e1c1', 'AdventWave Reference Catalogue (seed)', 'KE', 'kenya',
        'catalog@adventwave.app', 'granted')
ON CONFLICT (id) DO NOTHING;

INSERT INTO licenses (id, church_id, consent_status, consent_document_url, territory,
                      granted_at, revenue_share_pct)
VALUES ('49e003c8-9fe6-5202-88f8-f38c5769749c', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', 'granted',
        'https://adventwave.app/seed/consent-placeholder.pdf', 'worldwide', now(), 0.00)
ON CONFLICT (id) DO NOTHING;

-- Artists
INSERT INTO artists (id, name, slug, cover_url, church_id, verified) VALUES
  ('0719ce9d-c038-5eb3-b63f-fb28d075f572', 'Heritage Singers', 'heritage-singers', 'https://picsum.photos/seed/come-thou/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('6a9ae2e9-96a3-5078-9f96-e28ff5f559c7', 'Adventist Youth Choir', 'adventist-youth-choir', 'https://picsum.photos/seed/it-is-well/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('fcae3f97-ab4c-5953-8b85-69bb1276c048', 'Loma Linda University Church', 'loma-linda-university-church', 'https://picsum.photos/seed/faithfulness/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('45a3612b-f0e4-5ae5-bebc-7959409f484a', 'Kings Heralds', 'kings-heralds', 'https://picsum.photos/seed/vision/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('3c5ea321-382b-5373-9353-1f09c5bd8fed', 'Oakwood University Aeolians', 'oakwood-university-aeolians', 'https://picsum.photos/seed/how-great/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('5735e77d-e4c8-566e-8b73-6dd34cc2f229', 'Hope Channel Studio', 'hope-channel-studio', 'https://picsum.photos/seed/assurance/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('aa3ca08c-5be0-598a-b345-bcbec21b0c23', 'Young Adventists Collective', 'young-adventists-collective', 'https://picsum.photos/seed/christ-alone/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('358bb4b4-42cd-584a-8061-afb227a570d7', 'Sabbath Rest Sessions', 'sabbath-rest-sessions', 'https://picsum.photos/seed/grace-acoustic/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('f0cef904-474e-5ea6-971a-883bd9d40fb4', 'Instrumental Faith', 'instrumental-faith', 'https://picsum.photos/seed/shepherd/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('d915a058-926c-5eb5-aecf-37d6c4baf40d', 'Family Worship Band', 'family-worship-band', 'https://picsum.photos/seed/eyes-jesus/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('eb7548dc-f5f3-5293-9ebb-a1d0722907e7', 'Pacific Union College', 'pacific-union-college', 'https://picsum.photos/seed/holy3/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('0728079c-0062-5c66-8dae-b991726353a1', 'Urban Praise', 'urban-praise', 'https://picsum.photos/seed/cornerstone/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('cf449d50-3f98-5001-90e3-d56697dccaf1', 'Maxwell SDA Church Choir, Nairobi', 'maxwell-sda-church-choir-nairobi', 'https://picsum.photos/seed/ke-tumsifu/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('232226a5-98c9-5e6d-bba5-bedf2033e4af', 'Kisumu Central SDA Cathedral Praise', 'kisumu-central-sda-cathedral-praise', 'https://picsum.photos/seed/ke-jina-yesu/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('b4f12b98-1b92-5b62-bfee-1d1827735da2', 'COSACOW Nairobi', 'cosacow-nairobi', 'https://picsum.photos/seed/ke-hakuna-mungu/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('66f87a1c-ec44-5769-b601-d100d542f26d', 'Nyayo Stadium Camp Meeting Choir', 'nyayo-stadium-camp-meeting-choir', 'https://picsum.photos/seed/ke-higher-ground/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('e2903ad1-5527-5fed-8c63-a02253c7f443', 'Mombasa Lighthouse SDA Youth', 'mombasa-lighthouse-sda-youth', 'https://picsum.photos/seed/ke-nataka-kuimba/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('12ac2320-e51b-5e9f-beb4-b0a76335f22a', 'Karen SDA Church Worship Team', 'karen-sda-church-worship-team', 'https://picsum.photos/seed/ke-bwana-karibu/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('1708d2b1-4043-5b88-ad2b-a2585f3cdaf3', 'Eldoret Central SDA Choir', 'eldoret-central-sda-choir', 'https://picsum.photos/seed/ke-nearer/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('b03c460a-26b2-592f-8077-ef4459b146e7', 'Nakuru Hillcrest SDA Singers', 'nakuru-hillcrest-sda-singers', 'https://picsum.photos/seed/ke-standing/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('008cdb7d-3874-5463-aefc-25333b2daf8a', 'Kisii County SDA Youth Mass Choir', 'kisii-county-sda-youth-mass-choir', 'https://picsum.photos/seed/ke-ill-go/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('e0215212-212e-51d7-896e-8db21da372b7', 'Thika Road SDA Youth Chorale', 'thika-road-sda-youth-chorale', 'https://picsum.photos/seed/ke-power-blood/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('56fd7833-ee07-570f-8a7d-0d74b1d23b17', 'Strathmore University SDA Fellowship', 'strathmore-university-sda-fellowship', 'https://picsum.photos/seed/ke-foundation/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('e115e7f2-5f85-5593-a781-22a5e79a78dd', 'Central Kenya Field Circuit Choir', 'central-kenya-field-circuit-choir', 'https://picsum.photos/seed/ke-when-we-all/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('8fa8494c-c50f-5324-8f4a-6d55d80168a5', 'Lake Victoria Gospel Collective', 'lake-victoria-gospel-collective', 'https://picsum.photos/seed/ke-love-jesus/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('e5cd6b15-4d03-5f3e-9b68-0fd11870659d', 'Westlands SDA Praise & Worship', 'westlands-sda-praise-worship', 'https://picsum.photos/seed/ke-blessed-karen/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('813e2b11-4d3e-5f3e-a7b9-295a44542bf8', 'Ukunda SDA Beach Camp Choir', 'ukunda-sda-beach-camp-choir', 'https://picsum.photos/seed/ke-holy-manna/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('980b65ca-6027-5f44-a6d7-f2a4ab41b017', 'University of Nairobi Adventist Students', 'university-of-nairobi-adventist-students', 'https://picsum.photos/seed/ke-taifa/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('441b27db-43ad-59af-b1ad-a178009706cb', 'Kajiado County Bush Camp Choir', 'kajiado-county-bush-camp-choir', 'https://picsum.photos/seed/ke-mlima/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('e1671121-3bbf-5c7b-be76-9a5d672aee3b', 'Adventist Youth Choir Kenya', 'adventist-youth-choir-kenya', 'https://picsum.photos/seed/ke-we-have-hope/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('263d3f37-aa18-5bd4-a596-550bb5ea171f', 'Pastor Dwight Nelson', 'pastor-dwight-nelson', 'https://picsum.photos/seed/ser-dwight/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('b903ef64-301d-5f48-afbd-f0917808774e', 'Pastor Mark Finley', 'pastor-mark-finley', 'https://picsum.photos/seed/ser-finley/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('41b46fc0-44d2-553e-b31c-991087c64841', 'Pastor Andrea King', 'pastor-andrea-king', 'https://picsum.photos/seed/ser-andrea/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('6a44b11c-aa1f-5165-8f9a-f12785f673a1', 'Adventist World Radio', 'adventist-world-radio', 'https://picsum.photos/seed/pod-awr/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('d4b9fcec-4311-58fa-adf1-f9f30b161427', 'Hope Channel Podcast', 'hope-channel-podcast', 'https://picsum.photos/seed/pod-hope/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE),
  ('43e2adf9-d3a6-51a6-bbe2-fc086c0b87a5', 'Sabbath School Podcast', 'sabbath-school-podcast', 'https://picsum.photos/seed/pod-ss/400/400', 'c9483745-dfe9-529f-bfec-7b69e614e1c1', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Albums
INSERT INTO albums (id, title, artist_id, cover_url) VALUES
  ('a1037c35-29ba-5ae4-b218-9b331fefd2de', 'Morning Worship', '0719ce9d-c038-5eb3-b63f-fb28d075f572', 'https://picsum.photos/seed/come-thou/400/400'),
  ('9641bf36-f5e1-5b0c-8239-62f1f7a54588', 'Peace Sessions', '6a9ae2e9-96a3-5078-9f96-e28ff5f559c7', 'https://picsum.photos/seed/it-is-well/400/400'),
  ('6bc3950d-e1c6-5059-ba0b-3fc8569f386a', 'Hymns Reimagined', 'fcae3f97-ab4c-5953-8b85-69bb1276c048', 'https://picsum.photos/seed/faithfulness/400/400'),
  ('3a0b6186-8cef-5acc-9ad6-40a6932a29fd', 'Celtic Light', '45a3612b-f0e4-5ae5-bebc-7959409f484a', 'https://picsum.photos/seed/vision/400/400'),
  ('4887df8f-1267-505e-b5c6-ffe34c8e8c02', 'Live at the Dome', '3c5ea321-382b-5373-9353-1f09c5bd8fed', 'https://picsum.photos/seed/how-great/400/400'),
  ('7ea88c82-0e5e-5be7-9833-0dc69e78a7ac', 'Quiet Hour', '5735e77d-e4c8-566e-8b73-6dd34cc2f229', 'https://picsum.photos/seed/assurance/400/400'),
  ('c7bac841-15ff-5a52-b765-7777fc538feb', 'Rise & Sing', 'aa3ca08c-5be0-598a-b345-bcbec21b0c23', 'https://picsum.photos/seed/christ-alone/400/400'),
  ('ec2fc123-d3bd-539d-9eb6-3b95ff1356cb', 'Acoustic Vol. 1', '358bb4b4-42cd-584a-8061-afb227a570d7', 'https://picsum.photos/seed/grace-acoustic/400/400'),
  ('fefdb500-f4a1-5f91-ada9-fc6784aa0996', 'Strings of Peace', 'f0cef904-474e-5ea6-971a-883bd9d40fb4', 'https://picsum.photos/seed/shepherd/400/400'),
  ('3fae4a5d-ba89-53c7-9b38-bed5252904f1', 'Together', 'd915a058-926c-5eb5-aecf-37d6c4baf40d', 'https://picsum.photos/seed/eyes-jesus/400/400'),
  ('9a821d7b-694f-5fa3-a402-230e2d2b9fe1', 'Camp Meeting 2024', 'eb7548dc-f5f3-5293-9ebb-a1d0722907e7', 'https://picsum.photos/seed/holy3/400/400'),
  ('e9c95df6-fa0b-5e62-b803-9d29d982fdb4', 'City Lights', '0728079c-0062-5c66-8dae-b991726353a1', 'https://picsum.photos/seed/cornerstone/400/400'),
  ('69d16df1-82d6-5b60-8271-3289f7fdc0cc', 'Swahili Praise Live', 'cf449d50-3f98-5001-90e3-d56697dccaf1', 'https://picsum.photos/seed/ke-tumsifu/400/400'),
  ('805fa184-812d-5bb3-9563-818c5e6d6494', 'Lake Basin Worship', '232226a5-98c9-5e6d-bba5-bedf2033e4af', 'https://picsum.photos/seed/ke-jina-yesu/400/400'),
  ('0b40986c-8fe0-52d0-9ce2-710da8476805', 'Voices of the City', 'b4f12b98-1b92-5b62-bfee-1d1827735da2', 'https://picsum.photos/seed/ke-hakuna-mungu/400/400'),
  ('45da77a0-73db-5b51-9481-5bbd5557dd2d', 'Kenya Union Camp 2023', '66f87a1c-ec44-5769-b601-d100d542f26d', 'https://picsum.photos/seed/ke-higher-ground/400/400'),
  ('8bd8fab4-c1e4-53cd-8b60-23464b20be80', 'Coast Praise Sessions', 'e2903ad1-5527-5fed-8c63-a02253c7f443', 'https://picsum.photos/seed/ke-nataka-kuimba/400/400'),
  ('dca237bd-d056-50cc-b176-496dada91d57', 'Evening Light Nairobi', '12ac2320-e51b-5e9f-beb4-b0a76335f22a', 'https://picsum.photos/seed/ke-bwana-karibu/400/400'),
  ('86653e33-0b76-5c86-b906-6a9143e31fc4', 'Rift Valley Hymn Festival', '1708d2b1-4043-5b88-ad2b-a2585f3cdaf3', 'https://picsum.photos/seed/ke-nearer/400/400'),
  ('f034336f-9a41-52d0-b6fc-4893d26f4eae', 'Great Rift Worship', 'b03c460a-26b2-592f-8077-ef4459b146e7', 'https://picsum.photos/seed/ke-standing/400/400'),
  ('f6095727-c73c-5610-81a2-19a231ab66e2', 'Green Hills Sendoff', '008cdb7d-3874-5463-aefc-25333b2daf8a', 'https://picsum.photos/seed/ke-ill-go/400/400'),
  ('f20cd91e-333d-55fc-a93f-48a06a756adc', 'Urban Revival Nights', 'e0215212-212e-51d7-896e-8db21da372b7', 'https://picsum.photos/seed/ke-power-blood/400/400'),
  ('6cf117b6-3c4d-5cfe-b865-7991dfb1a485', 'Campus Hymns Vol. 2', '56fd7833-ee07-570f-8a7d-0d74b1d23b17', 'https://picsum.photos/seed/ke-foundation/400/400'),
  ('3bba1648-9f71-5b16-ab3b-26307430ac6d', 'Sing Until We Reach the Shore', 'e115e7f2-5f85-5593-a781-22a5e79a78dd', 'https://picsum.photos/seed/ke-when-we-all/400/400'),
  ('d5cecea2-db49-5664-b69c-6cf16dde9f4a', 'Shores of Faith', '8fa8494c-c50f-5324-8f4a-6d55d80168a5', 'https://picsum.photos/seed/ke-love-jesus/400/400'),
  ('ed0349c6-fe72-5205-8e8d-3b89d9f96474', 'Nairobi Nights of Worship', 'e5cd6b15-4d03-5f3e-9b68-0fd11870659d', 'https://picsum.photos/seed/ke-blessed-karen/400/400'),
  ('05cfdfdf-7c23-5b0a-9fe8-9c758581af80', 'Coastal Camp Meeting', '813e2b11-4d3e-5f3e-a7b9-295a44542bf8', 'https://picsum.photos/seed/ke-holy-manna/400/400'),
  ('1053648f-d367-57ab-8414-9305f324c328', 'Pray for Kenya', '980b65ca-6027-5f44-a6d7-f2a4ab41b017', 'https://picsum.photos/seed/ke-taifa/400/400'),
  ('e73b5c7f-b4bb-50b4-9012-8950b5f9d129', 'Savanna Sabbath Songs', '441b27db-43ad-59af-b1ad-a178009706cb', 'https://picsum.photos/seed/ke-mlima/400/400'),
  ('53974ae7-ec8d-5cf4-a6e5-3a36a8e37aae', 'East-Central Africa Division Youth', 'e1671121-3bbf-5c7b-be76-9a5d672aee3b', 'https://picsum.photos/seed/ke-we-have-hope/400/400'),
  ('09b5bfc1-4e48-5c03-9efa-7ed52f3b3b2e', 'Pioneer Memorial Church', '263d3f37-aa18-5bd4-a596-550bb5ea171f', 'https://picsum.photos/seed/ser-dwight/400/400'),
  ('65469fa5-4ee9-5b39-9739-0e868adf6a1a', 'Prophecy & Peace', 'b903ef64-301d-5f48-afbd-f0917808774e', 'https://picsum.photos/seed/ser-finley/400/400'),
  ('3dbc536d-5274-5a6b-86d9-4a5205b8e25c', 'City Temple SDA', '41b46fc0-44d2-553e-b31c-991087c64841', 'https://picsum.photos/seed/ser-andrea/400/400'),
  ('9f1c2909-17a9-59da-a520-a90067cd7edb', 'Weekly Episode', '6a44b11c-aa1f-5165-8f9a-f12785f673a1', 'https://picsum.photos/seed/pod-awr/400/400'),
  ('ebbe57b6-7466-51b0-ad30-b7a38d0a7890', 'Season 4', 'd4b9fcec-4311-58fa-adf1-f9f30b161427', 'https://picsum.photos/seed/pod-hope/400/400'),
  ('d417c302-b19a-5498-b229-56c37d97f8f4', 'Book Study', '43e2adf9-d3a6-51a6-bbe2-fc086c0b87a5', 'https://picsum.photos/seed/pod-ss/400/400')
ON CONFLICT (id) DO NOTHING;

-- Catalogue. seed_source_url carries placeholder audio: these items have no masters and
-- no transcoded media_assets, so the stream endpoint falls back to it and logs a warning.
INSERT INTO media_items (id, media_type, title, artist_id, album_id, duration_ms, cover_url,
                         genre, language, region, popularity, status, license_id,
                         published_at, legacy_id, seed_source_url) VALUES
  ('2a633ea1-b26f-5521-a040-be85c52face6', 'song', 'Come Thou Fount', '0719ce9d-c038-5eb3-b63f-fb28d075f572', 'a1037c35-29ba-5ae4-b218-9b331fefd2de', 245000, 'https://picsum.photos/seed/come-thou/400/400', 'worship', 'en', 'global', 86, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's1', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
  ('602401d0-263e-5c8b-9a3d-b6222fe357c4', 'song', 'It Is Well', '6a9ae2e9-96a3-5078-9f96-e28ff5f559c7', '9641bf36-f5e1-5b0c-8239-62f1f7a54588', 312000, 'https://picsum.photos/seed/it-is-well/400/400', 'choir', 'en', 'global', 88, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's2', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'),
  ('12d30ae4-97cb-561a-a1cd-fc259c11666c', 'song', 'Great Is Thy Faithfulness', 'fcae3f97-ab4c-5953-8b85-69bb1276c048', '6bc3950d-e1c6-5059-ba0b-3fc8569f386a', 278000, 'https://picsum.photos/seed/faithfulness/400/400', 'worship', 'en', 'global', 84, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'),
  ('c51b9da4-0b5e-5e05-a717-ab6f8f41a03f', 'song', 'Be Thou My Vision', '45a3612b-f0e4-5ae5-bebc-7959409f484a', '3a0b6186-8cef-5acc-9ad6-40a6932a29fd', 201000, 'https://picsum.photos/seed/vision/400/400', 'worship', 'en', 'global', 79, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's4', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'),
  ('b088e229-43e9-5927-a452-304e804423b6', 'song', 'How Great Thou Art', '3c5ea321-382b-5373-9353-1f09c5bd8fed', '4887df8f-1267-505e-b5c6-ffe34c8e8c02', 356000, 'https://picsum.photos/seed/how-great/400/400', 'choir', 'en', 'global', 92, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's5', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'),
  ('1f6f0ceb-ebf1-5cac-b9b2-6079bcaec7fa', 'song', 'Blessed Assurance', '5735e77d-e4c8-566e-8b73-6dd34cc2f229', '7ea88c82-0e5e-5be7-9833-0dc69e78a7ac', 189000, 'https://picsum.photos/seed/assurance/400/400', 'worship', 'en', 'global', 81, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's6', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3'),
  ('759cd130-0284-506a-91fc-d63c50b86cb7', 'song', 'In Christ Alone', 'aa3ca08c-5be0-598a-b345-bcbec21b0c23', 'c7bac841-15ff-5a52-b765-7777fc538feb', 267000, 'https://picsum.photos/seed/christ-alone/400/400', 'youth', 'en', 'global', 87, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's7', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3'),
  ('dcdb0177-591f-58fe-ae2e-13fc2e1b0ae4', 'song', 'Amazing Grace (Acoustic)', '358bb4b4-42cd-584a-8061-afb227a570d7', 'ec2fc123-d3bd-539d-9eb6-3b95ff1356cb', 224000, 'https://picsum.photos/seed/grace-acoustic/400/400', 'acoustic', 'en', 'global', 83, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's8', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'),
  ('b8346511-ee8b-53e5-9ec4-da28a4c6008d', 'song', 'The Lord Is My Shepherd', 'f0cef904-474e-5ea6-971a-883bd9d40fb4', 'fefdb500-f4a1-5f91-ada9-fc6784aa0996', 198000, 'https://picsum.photos/seed/shepherd/400/400', 'instrumental', 'en', 'global', 76, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's9', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3'),
  ('b014e991-b4a7-5067-8ca5-f47d935cbd57', 'song', 'Turn Your Eyes Upon Jesus', 'd915a058-926c-5eb5-aecf-37d6c4baf40d', '3fae4a5d-ba89-53c7-9b38-bed5252904f1', 241000, 'https://picsum.photos/seed/eyes-jesus/400/400', 'worship', 'en', 'global', 80, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's10', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'),
  ('fb1faa85-f656-5ca9-9dc3-810fd3f7fb9a', 'song', 'Holy, Holy, Holy', 'eb7548dc-f5f3-5293-9ebb-a1d0722907e7', '9a821d7b-694f-5fa3-a402-230e2d2b9fe1', 293000, 'https://picsum.photos/seed/holy3/400/400', 'choir', 'en', 'global', 85, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's11', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3'),
  ('cdc93401-b178-5961-a8b6-f03f32e66c1d', 'song', 'Cornerstone', '0728079c-0062-5c66-8dae-b991726353a1', 'e9c95df6-fa0b-5e62-b803-9d29d982fdb4', 255000, 'https://picsum.photos/seed/cornerstone/400/400', 'youth', 'en', 'global', 82, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's12', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3'),
  ('f6f77538-812c-5be1-ad5a-a8fa6b2d380c', 'song', 'Tumsifu Bwana', 'cf449d50-3f98-5001-90e3-d56697dccaf1', '69d16df1-82d6-5b60-8271-3289f7fdc0cc', 268000, 'https://picsum.photos/seed/ke-tumsifu/400/400', 'gospel_swahili', 'sw', 'kenya', 90, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's13', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3'),
  ('845076a9-a3b7-541b-be0c-aa598058b16b', 'song', 'Jina Lake Yesu', '232226a5-98c9-5e6d-bba5-bedf2033e4af', '805fa184-812d-5bb3-9563-818c5e6d6494', 241000, 'https://picsum.photos/seed/ke-jina-yesu/400/400', 'gospel_swahili', 'sw', 'kenya', 89, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's14', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3'),
  ('3268c157-91dc-5e4f-a1ac-5ec9357c98b9', 'song', 'Hakuna Mungu Kama Wewe', 'b4f12b98-1b92-5b62-bfee-1d1827735da2', '0b40986c-8fe0-52d0-9ce2-710da8476805', 302000, 'https://picsum.photos/seed/ke-hakuna-mungu/400/400', 'choir', 'mixed', 'kenya', 94, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's15', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3'),
  ('b1849393-89d6-5f63-af02-312190b9b6e4', 'song', 'Higher Ground (Live)', '66f87a1c-ec44-5769-b601-d100d542f26d', '45da77a0-73db-5b51-9481-5bbd5557dd2d', 289000, 'https://picsum.photos/seed/ke-higher-ground/400/400', 'camp_meeting', 'mixed', 'kenya', 91, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's16', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3'),
  ('ea5e9ef3-634d-52f1-8da5-f6f2c2012d01', 'song', 'Nataka Kuimba', 'e2903ad1-5527-5fed-8c63-a02253c7f443', '8bd8fab4-c1e4-53cd-8b60-23464b20be80', 226000, 'https://picsum.photos/seed/ke-nataka-kuimba/400/400', 'youth', 'sw', 'kenya', 86, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's17', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
  ('a7e29274-7869-5bc4-9ee8-ecf818f949df', 'song', 'Bwana U Karibu', '12ac2320-e51b-5e9f-beb4-b0a76335f22a', 'dca237bd-d056-50cc-b176-496dada91d57', 254000, 'https://picsum.photos/seed/ke-bwana-karibu/400/400', 'worship', 'mixed', 'kenya', 88, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's18', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'),
  ('a01fb699-4901-50fe-a295-df415f8df96c', 'song', 'Nearer, My God, to Thee', '1708d2b1-4043-5b88-ad2b-a2585f3cdaf3', '86653e33-0b76-5c86-b906-6a9143e31fc4', 318000, 'https://picsum.photos/seed/ke-nearer/400/400', 'choir', 'en', 'kenya', 84, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's19', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'),
  ('250b62aa-4a0d-5d4b-88cf-a94bfd3c3c1e', 'song', 'Standing on the Promises', 'b03c460a-26b2-592f-8077-ef4459b146e7', 'f034336f-9a41-52d0-b6fc-4893d26f4eae', 233000, 'https://picsum.photos/seed/ke-standing/400/400', 'worship', 'en', 'kenya', 83, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's20', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'),
  ('1f53823a-bc15-5ca3-8c94-6592fb21b097', 'song', 'I''ll Go Where You Want Me to Go', '008cdb7d-3874-5463-aefc-25333b2daf8a', 'f6095727-c73c-5610-81a2-19a231ab66e2', 276000, 'https://picsum.photos/seed/ke-ill-go/400/400', 'choir', 'mixed', 'kenya', 85, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's21', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'),
  ('b0ea406a-81c6-5010-9641-4944fdcc11be', 'song', 'There Is Power in the Blood', 'e0215212-212e-51d7-896e-8db21da372b7', 'f20cd91e-333d-55fc-a93f-48a06a756adc', 244000, 'https://picsum.photos/seed/ke-power-blood/400/400', 'youth', 'en', 'kenya', 87, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's22', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3'),
  ('ccd2d7da-5b3c-5e20-b14f-2c4944c6c1df', 'song', 'Christ Is Made the Sure Foundation', '56fd7833-ee07-570f-8a7d-0d74b1d23b17', '6cf117b6-3c4d-5cfe-b865-7991dfb1a485', 291000, 'https://picsum.photos/seed/ke-foundation/400/400', 'worship', 'en', 'kenya', 81, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's23', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3'),
  ('7c3fb812-c258-5a6a-8fb4-567390b46c4b', 'song', 'When We All Get to Heaven', 'e115e7f2-5f85-5593-a781-22a5e79a78dd', '3bba1648-9f71-5b16-ab3b-26307430ac6d', 212000, 'https://picsum.photos/seed/ke-when-we-all/400/400', 'choir', 'en', 'kenya', 82, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's24', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'),
  ('5274b600-2815-5275-b99a-3732126938f3', 'song', 'O How I Love Jesus', '8fa8494c-c50f-5324-8f4a-6d55d80168a5', 'd5cecea2-db49-5664-b69c-6cf16dde9f4a', 198000, 'https://picsum.photos/seed/ke-love-jesus/400/400', 'gospel_swahili', 'mixed', 'kenya', 86, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's25', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3'),
  ('214e61c3-61c9-59b0-84aa-4cc8280c3792', 'song', 'Blessed Assurance (Karen Session)', 'e5cd6b15-4d03-5f3e-9b68-0fd11870659d', 'ed0349c6-fe72-5205-8e8d-3b89d9f96474', 265000, 'https://picsum.photos/seed/ke-blessed-karen/400/400', 'worship', 'en', 'kenya', 84, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's26', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'),
  ('cf0e435a-f6ad-541c-b309-a52b86db3e12', 'song', 'Holy Manna', '813e2b11-4d3e-5f3e-a7b9-295a44542bf8', '05cfdfdf-7c23-5b0a-9fe8-9c758581af80', 187000, 'https://picsum.photos/seed/ke-holy-manna/400/400', 'camp_meeting', 'mixed', 'kenya', 78, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's27', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3'),
  ('959e1eb6-53cc-573a-bfc0-ff30d6e10383', 'song', 'Taifa Lako, Bwana (Your Nation, Lord)', '980b65ca-6027-5f44-a6d7-f2a4ab41b017', '1053648f-d367-57ab-8414-9305f324c328', 259000, 'https://picsum.photos/seed/ke-taifa/400/400', 'youth', 'sw', 'kenya', 88, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's28', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3'),
  ('9758776b-7f40-571c-89fd-2c5ffc5dd3ae', 'song', 'Mlima wa Mbele', '441b27db-43ad-59af-b1ad-a178009706cb', 'e73b5c7f-b4bb-50b4-9012-8950b5f9d129', 271000, 'https://picsum.photos/seed/ke-mlima/400/400', 'worship', 'mixed', 'kenya', 80, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's29', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3'),
  ('297caa2e-a047-58ba-86d8-b5da8b024801', 'song', 'We Have This Hope', 'e1671121-3bbf-5c7b-be76-9a5d672aee3b', '53974ae7-ec8d-5cf4-a6e5-3a36a8e37aae', 248000, 'https://picsum.photos/seed/ke-we-have-hope/400/400', 'choir', 'mixed', 'kenya', 93, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 's30', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3'),
  ('6ade5605-c3f6-5e34-a73f-a1ab936f1c1e', 'sermon', 'Grace That Transforms', '263d3f37-aa18-5bd4-a596-550bb5ea171f', '09b5bfc1-4e48-5c03-9efa-7ed52f3b3b2e', 2580000, 'https://picsum.photos/seed/ser-dwight/400/400', 'worship', 'en', 'global', 60, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 'ser1', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
  ('ff398b29-1758-5ff1-8ac2-c7218aaf3cc5', 'sermon', 'The Rest Remains', 'b903ef64-301d-5f48-afbd-f0917808774e', '65469fa5-4ee9-5b39-9739-0e868adf6a1a', 2820000, 'https://picsum.photos/seed/ser-finley/400/400', 'worship', 'en', 'global', 60, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 'ser2', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'),
  ('54a85fa5-7c5e-515a-9d57-269399711f09', 'sermon', 'Walking with Jesus Today', '41b46fc0-44d2-553e-b31c-991087c64841', '3dbc536d-5274-5a6b-86d9-4a5205b8e25c', 2340000, 'https://picsum.photos/seed/ser-andrea/400/400', 'worship', 'en', 'global', 60, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 'ser3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'),
  ('c9aecd72-1f6b-52d6-8efd-25e7f7bc6f6d', 'podcast', 'Faith on the Front Lines', '6a44b11c-aa1f-5165-8f9a-f12785f673a1', '9f1c2909-17a9-59da-a520-a90067cd7edb', 1842000, 'https://picsum.photos/seed/pod-awr/400/400', 'worship', 'en', 'global', 60, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 'ep1', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3'),
  ('61613639-ae5b-54d7-8a82-759f70620eb4', 'podcast', 'Hope Lives Here — Community Stories', 'd4b9fcec-4311-58fa-adf1-f9f30b161427', 'ebbe57b6-7466-51b0-ad30-b7a38d0a7890', 2205000, 'https://picsum.photos/seed/pod-hope/400/400', 'worship', 'en', 'global', 60, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 'ep2', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3'),
  ('2f928f89-1ab5-589a-97fa-4fbeddd887c5', 'podcast', 'Sabbath School Panel: Romans', '43e2adf9-d3a6-51a6-bbe2-fc086c0b87a5', 'd417c302-b19a-5498-b229-56c37d97f8f4', 3108000, 'https://picsum.photos/seed/pod-ss/400/400', 'worship', 'en', 'global', 60, 'published', '49e003c8-9fe6-5202-88f8-f38c5769749c', now(), 'ep3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3')
ON CONFLICT (id) DO NOTHING;

-- Curated playlists
INSERT INTO playlists (id, owner_id, title, description, cover_url, is_curated, is_public,
                       legacy_id) VALUES
  ('ab80a2d3-7887-59af-852a-884716e571bd', NULL, 'Sabbath Morning', 'Gentle hymns and worship to begin the day in stillness.', 'https://picsum.photos/seed/p-sabbath-morning/400/400', TRUE, TRUE, 'p1'),
  ('de758e47-6931-5aae-94bb-8b0b9fe5a4bc', NULL, 'Youth Night Live', 'High-energy praise from campuses and youth rallies.', 'https://picsum.photos/seed/p-youth-night/400/400', TRUE, TRUE, 'p2'),
  ('c7f35a06-0133-559b-ba17-c6c63eea2346', NULL, 'Study & Focus', 'Instrumental and soft vocals for reading and reflection.', 'https://picsum.photos/seed/p-study/400/400', TRUE, TRUE, 'p3'),
  ('4cfbc9d1-3f8f-5282-8593-9f6dd3985ab6', NULL, 'Choir Spotlight', 'Featured performances from university and church choirs.', 'https://picsum.photos/seed/p-choir/400/400', TRUE, TRUE, 'p4'),
  ('1f63e86e-e367-55d8-911e-354380af7744', NULL, 'Kenya — Sabbath & streets', 'Choirs and praise teams from Nairobi, Kisumu, Mombasa, and the Rift — mock catalogue celebrating Kenya.', 'https://picsum.photos/seed/p-kenya-sabbath/400/400', TRUE, TRUE, 'p5'),
  ('47807f4a-7ee8-5129-b4a0-b52d6ed40010', NULL, 'Swahili worship picks', 'Injili na tenzi kwa Kiswahili na mchanganyiko wa kiingereza.', 'https://picsum.photos/seed/p-swahili-worship/400/400', TRUE, TRUE, 'p6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO playlist_items (playlist_id, media_item_id, position) VALUES
  ('ab80a2d3-7887-59af-852a-884716e571bd', '2a633ea1-b26f-5521-a040-be85c52face6', 0),
  ('ab80a2d3-7887-59af-852a-884716e571bd', '12d30ae4-97cb-561a-a1cd-fc259c11666c', 1),
  ('ab80a2d3-7887-59af-852a-884716e571bd', '1f6f0ceb-ebf1-5cac-b9b2-6079bcaec7fa', 2),
  ('ab80a2d3-7887-59af-852a-884716e571bd', 'b014e991-b4a7-5067-8ca5-f47d935cbd57', 3),
  ('de758e47-6931-5aae-94bb-8b0b9fe5a4bc', '759cd130-0284-506a-91fc-d63c50b86cb7', 0),
  ('de758e47-6931-5aae-94bb-8b0b9fe5a4bc', 'cdc93401-b178-5961-a8b6-f03f32e66c1d', 1),
  ('de758e47-6931-5aae-94bb-8b0b9fe5a4bc', 'b088e229-43e9-5927-a452-304e804423b6', 2),
  ('de758e47-6931-5aae-94bb-8b0b9fe5a4bc', '602401d0-263e-5c8b-9a3d-b6222fe357c4', 3),
  ('c7f35a06-0133-559b-ba17-c6c63eea2346', 'b8346511-ee8b-53e5-9ec4-da28a4c6008d', 0),
  ('c7f35a06-0133-559b-ba17-c6c63eea2346', 'c51b9da4-0b5e-5e05-a717-ab6f8f41a03f', 1),
  ('c7f35a06-0133-559b-ba17-c6c63eea2346', 'dcdb0177-591f-58fe-ae2e-13fc2e1b0ae4', 2),
  ('c7f35a06-0133-559b-ba17-c6c63eea2346', '2a633ea1-b26f-5521-a040-be85c52face6', 3),
  ('4cfbc9d1-3f8f-5282-8593-9f6dd3985ab6', 'b088e229-43e9-5927-a452-304e804423b6', 0),
  ('4cfbc9d1-3f8f-5282-8593-9f6dd3985ab6', 'fb1faa85-f656-5ca9-9dc3-810fd3f7fb9a', 1),
  ('4cfbc9d1-3f8f-5282-8593-9f6dd3985ab6', '602401d0-263e-5c8b-9a3d-b6222fe357c4', 2),
  ('4cfbc9d1-3f8f-5282-8593-9f6dd3985ab6', '1f6f0ceb-ebf1-5cac-b9b2-6079bcaec7fa', 3),
  ('4cfbc9d1-3f8f-5282-8593-9f6dd3985ab6', '12d30ae4-97cb-561a-a1cd-fc259c11666c', 4),
  ('1f63e86e-e367-55d8-911e-354380af7744', 'f6f77538-812c-5be1-ad5a-a8fa6b2d380c', 0),
  ('1f63e86e-e367-55d8-911e-354380af7744', '845076a9-a3b7-541b-be0c-aa598058b16b', 1),
  ('1f63e86e-e367-55d8-911e-354380af7744', '3268c157-91dc-5e4f-a1ac-5ec9357c98b9', 2),
  ('1f63e86e-e367-55d8-911e-354380af7744', 'b1849393-89d6-5f63-af02-312190b9b6e4', 3),
  ('1f63e86e-e367-55d8-911e-354380af7744', 'ea5e9ef3-634d-52f1-8da5-f6f2c2012d01', 4),
  ('1f63e86e-e367-55d8-911e-354380af7744', 'a7e29274-7869-5bc4-9ee8-ecf818f949df', 5),
  ('1f63e86e-e367-55d8-911e-354380af7744', '959e1eb6-53cc-573a-bfc0-ff30d6e10383', 6),
  ('1f63e86e-e367-55d8-911e-354380af7744', '297caa2e-a047-58ba-86d8-b5da8b024801', 7),
  ('1f63e86e-e367-55d8-911e-354380af7744', 'a01fb699-4901-50fe-a295-df415f8df96c', 8),
  ('1f63e86e-e367-55d8-911e-354380af7744', '250b62aa-4a0d-5d4b-88cf-a94bfd3c3c1e', 9),
  ('47807f4a-7ee8-5129-b4a0-b52d6ed40010', 'f6f77538-812c-5be1-ad5a-a8fa6b2d380c', 0),
  ('47807f4a-7ee8-5129-b4a0-b52d6ed40010', '845076a9-a3b7-541b-be0c-aa598058b16b', 1),
  ('47807f4a-7ee8-5129-b4a0-b52d6ed40010', '3268c157-91dc-5e4f-a1ac-5ec9357c98b9', 2),
  ('47807f4a-7ee8-5129-b4a0-b52d6ed40010', 'ea5e9ef3-634d-52f1-8da5-f6f2c2012d01', 3),
  ('47807f4a-7ee8-5129-b4a0-b52d6ed40010', 'a7e29274-7869-5bc4-9ee8-ecf818f949df', 4),
  ('47807f4a-7ee8-5129-b4a0-b52d6ed40010', '959e1eb6-53cc-573a-bfc0-ff30d6e10383', 5),
  ('47807f4a-7ee8-5129-b4a0-b52d6ed40010', '9758776b-7f40-571c-89fd-2c5ffc5dd3ae', 6)
ON CONFLICT (playlist_id, media_item_id) DO NOTHING;

-- Editorial fallback for a listener with no history (Home.jsx recentlyPlayedIds).
INSERT INTO playlists (id, owner_id, title, description, cover_url, is_curated, is_public,
                       legacy_id)
VALUES ('00b09535-e940-5d02-adca-0c3d7ffd3776', NULL, 'Start here',
        'Shown on the home page until a listener has history of their own.', NULL,
        TRUE, FALSE, 'home-recently-played-fallback')
ON CONFLICT (id) DO NOTHING;

INSERT INTO playlist_items (playlist_id, media_item_id, position) VALUES
  ('00b09535-e940-5d02-adca-0c3d7ffd3776', 'c51b9da4-0b5e-5e05-a717-ab6f8f41a03f', 0),
  ('00b09535-e940-5d02-adca-0c3d7ffd3776', '2a633ea1-b26f-5521-a040-be85c52face6', 1),
  ('00b09535-e940-5d02-adca-0c3d7ffd3776', 'dcdb0177-591f-58fe-ae2e-13fc2e1b0ae4', 2),
  ('00b09535-e940-5d02-adca-0c3d7ffd3776', 'c9aecd72-1f6b-52d6-8efd-25e7f7bc6f6d', 3)
ON CONFLICT (playlist_id, media_item_id) DO NOTHING;

-- Discover categories
INSERT INTO discover_categories (id, label, gradient, cover_url, sort_order) VALUES
  ('worship', 'Worship', 'from-[#6D5DF6]/25 to-[#c9a227]/20', 'https://picsum.photos/seed/cat-worship/400/400', 0),
  ('youth', 'Youth', 'from-[#5b8def]/25 to-[#6D5DF6]/20', 'https://picsum.photos/seed/cat-youth/400/400', 1),
  ('instrumental', 'Instrumental', 'from-[#34d399]/20 to-[#6D5DF6]/15', 'https://picsum.photos/seed/cat-inst/400/400', 2),
  ('choirs', 'Choirs', 'from-[#f472b6]/20 to-[#c9a227]/15', 'https://picsum.photos/seed/cat-choirs/400/400', 3),
  ('churches', 'Churches', 'from-[#a78bfa]/25 to-[#6D5DF6]/20', 'https://picsum.photos/seed/cat-churches/400/400', 4),
  ('kenya', 'Kenya', 'from-emerald-500/25 to-amber-500/20', 'https://picsum.photos/seed/cat-kenya/400/400', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO discover_category_items (category_id, media_item_id, position) VALUES
  ('worship', '2a633ea1-b26f-5521-a040-be85c52face6', 0),
  ('worship', '12d30ae4-97cb-561a-a1cd-fc259c11666c', 1),
  ('worship', '1f6f0ceb-ebf1-5cac-b9b2-6079bcaec7fa', 2),
  ('worship', 'fb1faa85-f656-5ca9-9dc3-810fd3f7fb9a', 3),
  ('youth', '759cd130-0284-506a-91fc-d63c50b86cb7', 0),
  ('youth', 'cdc93401-b178-5961-a8b6-f03f32e66c1d', 1),
  ('youth', '602401d0-263e-5c8b-9a3d-b6222fe357c4', 2),
  ('instrumental', 'b8346511-ee8b-53e5-9ec4-da28a4c6008d', 0),
  ('instrumental', 'c51b9da4-0b5e-5e05-a717-ab6f8f41a03f', 1),
  ('instrumental', 'dcdb0177-591f-58fe-ae2e-13fc2e1b0ae4', 2),
  ('choirs', 'b088e229-43e9-5927-a452-304e804423b6', 0),
  ('choirs', 'fb1faa85-f656-5ca9-9dc3-810fd3f7fb9a', 1),
  ('choirs', '602401d0-263e-5c8b-9a3d-b6222fe357c4', 2),
  ('churches', '12d30ae4-97cb-561a-a1cd-fc259c11666c', 0),
  ('churches', '1f6f0ceb-ebf1-5cac-b9b2-6079bcaec7fa', 1),
  ('churches', 'b014e991-b4a7-5067-8ca5-f47d935cbd57', 2),
  ('kenya', 'f6f77538-812c-5be1-ad5a-a8fa6b2d380c', 0),
  ('kenya', '845076a9-a3b7-541b-be0c-aa598058b16b', 1),
  ('kenya', '3268c157-91dc-5e4f-a1ac-5ec9357c98b9', 2),
  ('kenya', 'b1849393-89d6-5f63-af02-312190b9b6e4', 3),
  ('kenya', 'ea5e9ef3-634d-52f1-8da5-f6f2c2012d01', 4),
  ('kenya', 'a7e29274-7869-5bc4-9ee8-ecf818f949df', 5),
  ('kenya', 'a01fb699-4901-50fe-a295-df415f8df96c', 6),
  ('kenya', '250b62aa-4a0d-5d4b-88cf-a94bfd3c3c1e', 7),
  ('kenya', '1f53823a-bc15-5ca3-8c94-6592fb21b097', 8),
  ('kenya', 'b0ea406a-81c6-5010-9641-4944fdcc11be', 9),
  ('kenya', 'ccd2d7da-5b3c-5e20-b14f-2c4944c6c1df', 10),
  ('kenya', '7c3fb812-c258-5a6a-8fb4-567390b46c4b', 11),
  ('kenya', '5274b600-2815-5275-b99a-3732126938f3', 12),
  ('kenya', '214e61c3-61c9-59b0-84aa-4cc8280c3792', 13),
  ('kenya', 'cf0e435a-f6ad-541c-b309-a52b86db3e12', 14),
  ('kenya', '959e1eb6-53cc-573a-bfc0-ff30d6e10383', 15),
  ('kenya', '9758776b-7f40-571c-89fd-2c5ffc5dd3ae', 16),
  ('kenya', '297caa2e-a047-58ba-86d8-b5da8b024801', 17)
ON CONFLICT (category_id, media_item_id) DO NOTHING;
