package org.adventwave.catalog.media;

import java.util.List;
import org.adventwave.contracts.api.MediaType;

public final class BitrateLadder {
    public static final String MUSIC = "music_v1";
    public static final String SPEECH = "speech_v1";
    public static final String DATA_SAVER = "aac_24_hev2";
    private static final List<String> MUSIC_PROFILES = List.of("aac_24_hev2", "aac_96", "aac_160", "aac_320");
    private static final List<String> SPEECH_PROFILES = List.of("aac_24_hev2", "aac_64", "aac_128");

    private BitrateLadder() {
    }

    public static String ladderFor(MediaType mediaType) {
        return mediaType.isSpeech() ? "speech_v1" : "music_v1";
    }

    public static List<String> profilesFor(MediaType mediaType) {
        return mediaType.isSpeech() ? SPEECH_PROFILES : MUSIC_PROFILES;
    }

    public static String resolveProfile(MediaType mediaType, String audioQuality) {
        List<String> list;
        byte b0;
        label26: {
            list = profilesFor(mediaType);
            String s;
            switch ((s = audioQuality == null ? "normal" : audioQuality).hashCode()) {
                case -1244775669:
                    if (s.equals("very_high")) {
                        b0 = 3;
                        break label26;
                    }
                    break;
                case 3202466:
                    if (s.equals("high")) {
                        b0 = 2;
                        break label26;
                    }
                    break;
                case 1619122624:
                    if (s.equals("data_saver")) {
                        b0 = 0;
                        break label26;
                    }
            }

            b0 = 1;
        }

        int i = b0;
        return list.get(Math.min(i, list.size() - 1));
    }
}
