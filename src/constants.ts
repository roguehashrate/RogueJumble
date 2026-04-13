import { kinds } from 'nostr-tools'
import { TRelaySet } from './types'

export const ROGUEJUMBLE_API_BASE_URL = 'https://api.jumble.social'

export const RECOMMENDED_BLOSSOM_SERVERS = [
  'https://blossom.band/',
  'https://blossom.primal.net/',
  'https://nostr.media/'
]

export const StorageKey = {
  VERSION: 'version',
  THEME_SETTING: 'themeSetting',
  RELAY_SETS: 'relaySets',
  ACCOUNTS: 'accounts',
  CURRENT_ACCOUNT: 'currentAccount',
  ADD_CLIENT_TAG: 'addClientTag',
  POW_ENABLED: 'powEnabled',
  POW_POST_DIFFICULTY: 'powPostDifficulty',
  POW_REACTION_DIFFICULTY: 'powReactionDifficulty',
  NOTE_LIST_MODE: 'noteListMode',
  NOTIFICATION_TYPE: 'notificationType',
  DEFAULT_ZAP_SATS: 'defaultZapSats',
  DEFAULT_ZAP_COMMENT: 'defaultZapComment',
  QUICK_ZAP: 'quickZap',
  WALLET_DISPLAY_UNIT: 'walletDisplayUnit',
  LAST_READ_NOTIFICATION_TIME_MAP: 'lastReadNotificationTimeMap',
  ACCOUNT_FEED_INFO_MAP: 'accountFeedInfoMap',
  AUTOPLAY: 'autoplay',
  VIDEO_LOOP: 'videoLoop',
  TRANSLATION_SERVICE_CONFIG_MAP: 'translationServiceConfigMap',
  MEDIA_UPLOAD_SERVICE_CONFIG_MAP: 'mediaUploadServiceConfigMap',
  DISMISSED_TOO_MANY_RELAYS_ALERT: 'dismissedTooManyRelaysAlert',
  SHOW_KINDS: 'showKinds',
  SHOW_KINDS_VERSION: 'showKindsVersion',
  HIDE_CONTENT_MENTIONING_MUTED_USERS: 'hideContentMentioningMutedUsers',
  NOTIFICATION_LIST_STYLE: 'notificationListStyle',
  MEDIA_AUTO_LOAD_POLICY: 'mediaAutoLoadPolicy',
  PROFILE_PICTURE_AUTO_LOAD_POLICY: 'profilePictureAutoLoadPolicy',
  SHOWN_CREATE_WALLET_GUIDE_TOAST_PUBKEYS: 'shownCreateWalletGuideToastPubkeys',
  SIDEBAR_COLLAPSE: 'sidebarCollapse',
  PRIMARY_COLOR: 'primaryColor',
  ENABLE_SINGLE_COLUMN_LAYOUT: 'enableSingleColumnLayout',
  FAVICON_URL_TEMPLATE: 'faviconUrlTemplate',
  FILTER_OUT_ONION_RELAYS: 'filterOutOnionRelays',
  ALLOW_INSECURE_CONNECTION: 'allowInsecureConnection',
  QUICK_REACTION: 'quickReaction',
  QUICK_REACTION_EMOJI: 'quickReactionEmoji',
  NSFW_DISPLAY_POLICY: 'nsfwDisplayPolicy',
  FONT: 'font',
  FONT_SIZE: 'fontSize',
  ADVANCED_MODE: 'advancedMode',
  DEFAULT_RELAY_URLS: 'defaultRelayUrls',
  MUTED_WORDS: 'mutedWords',
  MIN_TRUST_SCORE: 'minTrustScore',
  MIN_TRUST_SCORE_MAP: 'minTrustScoreMap',
  SEARCH_RELAY_URLS: 'searchRelayUrls',
  HIDE_INDIRECT_NOTIFICATIONS: 'hideIndirectNotifications',
  ENABLE_LIVE_FEED: 'enableLiveFeed', // deprecated
  HIDE_UNTRUSTED_NOTES: 'hideUntrustedNotes', // deprecated
  HIDE_UNTRUSTED_INTERACTIONS: 'hideUntrustedInteractions', // deprecated
  HIDE_UNTRUSTED_NOTIFICATIONS: 'hideUntrustedNotifications', // deprecated
  DEFAULT_SHOW_NSFW: 'defaultShowNsfw', // deprecated
  PINNED_PUBKEYS: 'pinnedPubkeys', // deprecated
  MEDIA_UPLOAD_SERVICE: 'mediaUploadService', // deprecated
  HIDE_UNTRUSTED_EVENTS: 'hideUntrustedEvents', // deprecated
  ACCOUNT_RELAY_LIST_EVENT_MAP: 'accountRelayListEventMap', // deprecated
  ACCOUNT_FOLLOW_LIST_EVENT_MAP: 'accountFollowListEventMap', // deprecated
  ACCOUNT_MUTE_LIST_EVENT_MAP: 'accountMuteListEventMap', // deprecated
  ACCOUNT_MUTE_DECRYPTED_TAGS_MAP: 'accountMuteDecryptedTagsMap', // deprecated
  ACCOUNT_PROFILE_EVENT_MAP: 'accountProfileEventMap', // deprecated
  ACTIVE_RELAY_SET_ID: 'activeRelaySetId', // deprecated
  FEED_TYPE: 'feedType' // deprecated
}

export const ApplicationDataKey = {
  NOTIFICATIONS_SEEN_AT: 'seen_notifications_at'
}

export const BIG_RELAY_URLS = [
  'wss://relay.damus.io/',
  'wss://nos.lol/',
  'wss://relay.primal.net/',
  'wss://relay.ditto.pub/'
]

export const SEARCHABLE_RELAY_URLS = ['wss://search.nos.today/', 'wss://relay.ditto.pub/', 'wss://nostr.polyserv.xyz/']

export const TRENDING_NOTES_RELAY_URLS = ['wss://trending.relays.land/']

export const GROUP_METADATA_EVENT_KIND = 39000

// NIP-29 Group Chat Event Kinds
export const NIP29_GROUP_KINDS = {
  GROUP_LIST: 10009, // NIP-51: User's group list
  GROUP_CHAT_MESSAGE: 9, // Simple group chat messages (client-side groups)
  GROUP_METADATA: 39000, // NIP-29: Group metadata (relay-enforced)
  GROUP_CREATE: 9007, // NIP-29: Create group
  GROUP_ADD_USER: 9000, // NIP-29: Add user
  GROUP_REMOVE_USER: 9001, // NIP-29: Remove user
  GROUP_EDIT_METADATA: 9002, // NIP-29: Edit metadata
  GROUP_DELETE_EVENT: 9003, // NIP-29: Delete event
  GROUP_JOIN_REQUEST: 9021, // NIP-29: Join request
  GROUP_LEAVE_REQUEST: 9022 // NIP-29: Leave request
} as const

export const ExtendedKind = {
  EXTERNAL_CONTENT_REACTION: 17,
  PICTURE: 20,
  VIDEO: 21,
  SHORT_VIDEO: 22,
  POLL: 1068,
  POLL_RESPONSE: 1018,
  COMMENT: 1111,
  VOICE: 1222,
  VOICE_COMMENT: 1244,
  PINNED_USERS: 10010,
  FAVORITE_RELAYS: 10012,
  BLOSSOM_SERVER_LIST: 10063,
  FOLLOW_PACK: 39089,
  RELAY_REVIEW: 31987,
  GROUP_METADATA: 39000,
  ADDRESSABLE_NORMAL_VIDEO: 34235,
  ADDRESSABLE_SHORT_VIDEO: 34236,
  COMMUNITY_POST: 34551,
  COMMUNITY_APPROVAL: 4550
}

export const ALLOWED_FILTER_KINDS = [
  kinds.ShortTextNote,
  kinds.Repost,
  kinds.GenericRepost,
  ExtendedKind.PICTURE,
  ExtendedKind.VIDEO,
  ExtendedKind.SHORT_VIDEO,
  ExtendedKind.POLL,
  ExtendedKind.COMMENT,
  ExtendedKind.VOICE,
  ExtendedKind.VOICE_COMMENT,
  kinds.Highlights,
  kinds.LongFormArticle,
  ExtendedKind.ADDRESSABLE_NORMAL_VIDEO,
  ExtendedKind.ADDRESSABLE_SHORT_VIDEO
]

export const SUPPORTED_KINDS = [
  ...ALLOWED_FILTER_KINDS,
  ExtendedKind.RELAY_REVIEW,
  kinds.Emojisets,
  ExtendedKind.FOLLOW_PACK,
  kinds.Reaction,
  ExtendedKind.EXTERNAL_CONTENT_REACTION,
  ExtendedKind.COMMUNITY_POST
]

export const URL_REGEX =
  /https?:\/\/[\w\p{L}\p{N}\p{M}&.\-/?=#@%+_:!~*()]+[^\s.,;:'"(\]}!?，。；："'！？】）]/giu
export const WS_URL_REGEX =
  /wss?:\/\/[\w\p{L}\p{N}\p{M}&.\-/?=#@%+_:!~*()]+[^\s.,;:'"(\]}!?，。；："'！？】）]/giu
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
export const EMOJI_SHORT_CODE_REGEX = /:[a-zA-Z0-9_-]+:/g
export const EMBEDDED_EVENT_REGEX = /nostr:(note1[a-z0-9]{58}|nevent1[a-z0-9]+|naddr1[a-z0-9]+)/g
export const BECH32_EVENT_REGEX = /(note1[a-z0-9]{58}|nevent1[a-z0-9]+|naddr1[a-z0-9]+)/g
export const GROUP_LINK_REGEX = /nostr:group:([a-z0-9-_]+)@([^\s]+)/gi
export const EMBEDDED_MENTION_REGEX = /nostr:(npub1[a-z0-9]{58}|nprofile1[a-z0-9]+)/g
export const HASHTAG_REGEX = /#[\p{L}\p{N}\p{M}_]+/gu
export const LN_INVOICE_REGEX = /(ln(?:bc|tb|bcrt))([0-9]+[munp]?)?1([02-9ac-hj-np-z]+)/g
export const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F18E}]|[\u{3030}]|[\u{2B50}]|[\u{2B55}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{3297}]|[\u{3299}]|[\u{303D}]|[\u{00A9}]|[\u{00AE}]|[\u{2122}]|[\u{23E9}-\u{23EF}]|[\u{23F0}]|[\u{23F3}]|[\u{FE00}-\u{FE0F}]|[\u{200D}]/gu
export const YOUTUBE_URL_REGEX =
  /https?:\/\/(?:(?:www|m)\.)?(?:youtube\.com\/(?:watch\?[^#\s]*|embed\/[\w-]+|shorts\/[\w-]+|live\/[\w-]+)|youtu\.be\/[\w-]+)(?:\?[^#\s]*)?(?:#[^\s]*)?/i
export const X_URL_REGEX =
  /https?:\/\/(?:www\.)?(twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)(?:[?#].*)?/i

export const ROGUEJUMBLE_PUBKEY = 'f4eb8e62add1340b9cadcd9861e669b2e907cea534e0f7f3ac974c11c758a51a'
export const ROGUE_HASHRATE_PUBKEY =
  'bc28aad5b167f31dd37c66d8c95d400c6411d83275ed12c504f60965d1f9eec6'

export const NIP_96_SERVICE = [
  'https://mockingyou.com',
  'https://nostpic.com',
  'https://nostr.build', // default
  'https://nostrcheck.me',
  'https://nostrmedia.com',
  'https://files.sovbit.host'
]
export const DEFAULT_NIP_96_SERVICE = 'https://nostr.build'

export const DEFAULT_NOSTRCONNECT_RELAY = [
  'wss://bucket.coracle.social/',
  'wss://relay.primal.net/',
  'wss://relay.damus.io/'
]

export const DEFAULT_FAVICON_URL_TEMPLATE = 'https://{hostname}/favicon.ico'

export const POLL_TYPE = {
  MULTIPLE_CHOICE: 'multiplechoice',
  SINGLE_CHOICE: 'singlechoice'
} as const

export const NOTIFICATION_LIST_STYLE = {
  COMPACT: 'compact',
  DETAILED: 'detailed'
} as const

export const MEDIA_AUTO_LOAD_POLICY = {
  ALWAYS: 'always',
  WIFI_ONLY: 'wifi-only',
  NEVER: 'never'
} as const

export const PROFILE_PICTURE_AUTO_LOAD_POLICY = {
  ALWAYS: 'always',
  WIFI_ONLY: 'wifi-only',
  NEVER: 'never'
} as const

export const NSFW_DISPLAY_POLICY = {
  HIDE: 'hide',
  HIDE_CONTENT: 'hide_content',
  SHOW: 'show'
} as const

export const FONT = {
  DEFAULT: 'default',
  MONOSPACE: 'monospace',
  DYSLEXIC: 'dyslexic',
  SOURCESANS: 'sourcesans'
} as const
export type TFont = (typeof FONT)[keyof typeof FONT]

export const FONT_SIZE = {
  DEFAULT: 'default',
  MEDIUM: 'medium',
  LARGE: 'large'
} as const
export type TFontSize = (typeof FONT_SIZE)[keyof typeof FONT_SIZE]

export const MAX_PINNED_NOTES = 10

export const PRIMARY_COLORS = {
  DEFAULT: {
    name: 'Default',
    light: {
      primary: '259 43% 56%',
      'primary-hover': '259 43% 65%',
      'primary-foreground': '0 0% 98%',
      ring: '259 43% 56%'
    },
    dark: {
      primary: '259 43% 56%',
      'primary-hover': '259 43% 65%',
      'primary-foreground': '240 5.9% 10%',
      ring: '259 43% 56%'
    }
  },
  RED: {
    name: 'Red',
    light: {
      primary: '0 65% 55%',
      'primary-hover': '0 65% 65%',
      'primary-foreground': '0 0% 98%',
      ring: '0 65% 55%'
    },
    dark: {
      primary: '0 65% 55%',
      'primary-hover': '0 65% 65%',
      'primary-foreground': '240 5.9% 10%',
      ring: '0 65% 55%'
    }
  },
  ORANGE: {
    name: 'Orange',
    light: {
      primary: '30 100% 50%',
      'primary-hover': '30 100% 60%',
      'primary-foreground': '0 0% 98%',
      ring: '30 100% 50%'
    },
    dark: {
      primary: '30 100% 50%',
      'primary-hover': '30 100% 60%',
      'primary-foreground': '240 5.9% 10%',
      ring: '30 100% 50%'
    }
  },
  AMBER: {
    name: 'Amber',
    light: {
      primary: '42 100% 50%',
      'primary-hover': '42 100% 60%',
      'primary-foreground': '0 0% 98%',
      ring: '42 100% 50%'
    },
    dark: {
      primary: '42 100% 50%',
      'primary-hover': '42 100% 60%',
      'primary-foreground': '240 5.9% 10%',
      ring: '42 100% 50%'
    }
  },
  YELLOW: {
    name: 'Yellow',
    light: {
      primary: '54 100% 50%',
      'primary-hover': '54 100% 60%',
      'primary-foreground': '0 0% 10%',
      ring: '54 100% 50%'
    },
    dark: {
      primary: '54 100% 50%',
      'primary-hover': '54 100% 60%',
      'primary-foreground': '240 5.9% 10%',
      ring: '54 100% 50%'
    }
  },
  LIME: {
    name: 'Lime',
    light: {
      primary: '90 60% 50%',
      'primary-hover': '90 60% 60%',
      'primary-foreground': '0 0% 98%',
      ring: '90 60% 50%'
    },
    dark: {
      primary: '90 60% 50%',
      'primary-hover': '90 60% 60%',
      'primary-foreground': '240 5.9% 10%',
      ring: '90 60% 50%'
    }
  },
  GREEN: {
    name: 'Green',
    light: {
      primary: '140 60% 40%',
      'primary-hover': '140 60% 50%',
      'primary-foreground': '0 0% 98%',
      ring: '140 60% 40%'
    },
    dark: {
      primary: '140 60% 40%',
      'primary-hover': '140 60% 50%',
      'primary-foreground': '240 5.9% 10%',
      ring: '140 60% 40%'
    }
  },
  EMERALD: {
    name: 'Emerald',
    light: {
      primary: '160 70% 40%',
      'primary-hover': '160 70% 50%',
      'primary-foreground': '0 0% 98%',
      ring: '160 70% 40%'
    },
    dark: {
      primary: '160 70% 40%',
      'primary-hover': '160 70% 50%',
      'primary-foreground': '240 5.9% 10%',
      ring: '160 70% 40%'
    }
  },
  TEAL: {
    name: 'Teal',
    light: {
      primary: '180 70% 40%',
      'primary-hover': '180 70% 50%',
      'primary-foreground': '0 0% 98%',
      ring: '180 70% 40%'
    },
    dark: {
      primary: '180 70% 40%',
      'primary-hover': '180 70% 50%',
      'primary-foreground': '240 5.9% 10%',
      ring: '180 70% 40%'
    }
  },
  CYAN: {
    name: 'Cyan',
    light: {
      primary: '200 70% 40%',
      'primary-hover': '200 70% 50%',
      'primary-foreground': '0 0% 98%',
      ring: '200 70% 40%'
    },
    dark: {
      primary: '200 70% 40%',
      'primary-hover': '200 70% 50%',
      'primary-foreground': '240 5.9% 10%',
      ring: '200 70% 40%'
    }
  },
  SKY: {
    name: 'Sky',
    light: {
      primary: '210 70% 50%',
      'primary-hover': '210 70% 60%',
      'primary-foreground': '0 0% 98%',
      ring: '210 70% 50%'
    },
    dark: {
      primary: '210 70% 50%',
      'primary-hover': '210 70% 60%',
      'primary-foreground': '240 5.9% 10%',
      ring: '210 70% 50%'
    }
  },
  BLUE: {
    name: 'Blue',
    light: {
      primary: '220 80% 50%',
      'primary-hover': '220 80% 60%',
      'primary-foreground': '0 0% 98%',
      ring: '220 80% 50%'
    },
    dark: {
      primary: '220 80% 50%',
      'primary-hover': '220 80% 60%',
      'primary-foreground': '240 5.9% 10%',
      ring: '220 80% 50%'
    }
  },
  INDIGO: {
    name: 'Indigo',
    light: {
      primary: '230 80% 50%',
      'primary-hover': '230 80% 60%',
      'primary-foreground': '0 0% 98%',
      ring: '230 80% 50%'
    },
    dark: {
      primary: '230 80% 50%',
      'primary-hover': '230 80% 60%',
      'primary-foreground': '240 5.9% 10%',
      ring: '230 80% 50%'
    }
  },
  VIOLET: {
    name: 'Violet',
    light: {
      primary: '250 80% 50%',
      'primary-hover': '250 80% 60%',
      'primary-foreground': '0 0% 98%',
      ring: '250 80% 50%'
    },
    dark: {
      primary: '250 80% 50%',
      'primary-hover': '250 80% 60%',
      'primary-foreground': '240 5.9% 10%',
      ring: '250 80% 50%'
    }
  },
  PURPLE: {
    name: 'Purple',
    light: {
      primary: '280 80% 50%',
      'primary-hover': '280 80% 60%',
      'primary-foreground': '0 0% 98%',
      ring: '280 80% 50%'
    },
    dark: {
      primary: '280 80% 50%',
      'primary-hover': '280 80% 60%',
      'primary-foreground': '240 5.9% 10%',
      ring: '280 80% 50%'
    }
  },
  FUCHSIA: {
    name: 'Fuchsia',
    light: {
      primary: '310 80% 50%',
      'primary-hover': '310 80% 60%',
      'primary-foreground': '0 0% 98%',
      ring: '310 80% 50%'
    },
    dark: {
      primary: '310 80% 50%',
      'primary-hover': '310 80% 60%',
      'primary-foreground': '240 5.9% 10%',
      ring: '310 80% 50%'
    }
  },
  PINK: {
    name: 'Pink',
    light: {
      primary: '330 80% 60%',
      'primary-hover': '330 80% 70%',
      'primary-foreground': '0 0% 10%',
      ring: '330 80% 60%'
    },
    dark: {
      primary: '330 80% 60%',
      'primary-hover': '330 80% 70%',
      'primary-foreground': '240 5.9% 10%',
      ring: '330 80% 60%'
    }
  },
  ROSE: {
    name: 'Rose',
    light: {
      primary: '350 80% 60%',
      'primary-hover': '350 80% 70%',
      'primary-foreground': '0 0% 10%',
      ring: '350 80% 60%'
    },
    dark: {
      primary: '350 80% 60%',
      'primary-hover': '350 80% 70%',
      'primary-foreground': '240 5.9% 10%',
      ring: '350 80% 60%'
    }
  }
} as const
export type TPrimaryColor = keyof typeof PRIMARY_COLORS

export const THEME_COLORS = {
  rogue: {
    name: 'Rogue',
    colors: {
      background: '0 0% 0%',
      foreground: '0 0% 98%',
      card: '0 0% 5%',
      cardForeground: '0 0% 98%',
      popover: '0 0% 8%',
      popoverForeground: '0 0% 98%',
      primary: '25 95% 55%',
      primaryHover: '25 95% 65%',
      primaryForeground: '0 0% 0%',
      secondary: '0 0% 15%',
      secondaryForeground: '0 0% 98%',
      muted: '0 0% 12%',
      mutedForeground: '0 0% 60%',
      accent: '25 95% 55%',
      accentForeground: '0 0% 0%',
      destructive: '0 62% 30%',
      destructiveForeground: '0 0% 98%',
      border: '0 0% 18%',
      input: '0 0% 15%',
      ring: '25 95% 55%',
      surfaceBackground: '0 0% 3%',
      zap: '45 93% 47%',
      repost: '142 71% 45%',
      bookmark: '346 86% 56%',
      comment: '217 91% 60%',
      noteHover: '0 0% 3.5%'
    },
    style: {
      radius: '1rem',
      scanlineOpacity: '0',
      bgGradient: 'none',
      textShadow: 'none',
      fontFamily: '',
      meshOpacity: '1',
      cardBorderWidth: '0px'
    }
  },
  emerald: {
    name: 'Emerald',
    colors: {
      background: '150 20% 5%',
      foreground: '150 10% 95%',
      card: '150 15% 8%',
      cardForeground: '150 10% 95%',
      popover: '150 15% 10%',
      popoverForeground: '150 10% 95%',
      primary: '152 69% 46%',
      primaryHover: '152 69% 54%',
      primaryForeground: '150 20% 5%',
      secondary: '150 10% 15%',
      secondaryForeground: '150 10% 95%',
      muted: '150 10% 12%',
      mutedForeground: '150 8% 60%',
      accent: '152 69% 46%',
      accentForeground: '150 20% 5%',
      destructive: '0 62% 30%',
      destructiveForeground: '150 10% 95%',
      border: '150 10% 18%',
      input: '150 10% 15%',
      ring: '152 69% 46%',
      surfaceBackground: '150 20% 3%',
      zap: '45 93% 47%',
      repost: '142 71% 45%',
      bookmark: '346 86% 56%',
      comment: '217 91% 60%',
      noteHover: '150 15% 7%'
    },
    style: {
      radius: '1rem',
      scanlineOpacity: '0',
      bgGradient: 'none',
      textShadow: 'none',
      fontFamily: '',
      meshOpacity: '1',
      cardBorderWidth: '0px'
    }
  },
  sapphire: {
    name: 'Sapphire',
    colors: {
      background: '220 25% 6%',
      foreground: '220 15% 95%',
      card: '220 20% 9%',
      cardForeground: '220 15% 95%',
      popover: '220 20% 11%',
      popoverForeground: '220 15% 95%',
      primary: '213 94% 55%',
      primaryHover: '213 94% 63%',
      primaryForeground: '220 25% 6%',
      secondary: '220 15% 15%',
      secondaryForeground: '220 15% 95%',
      muted: '220 15% 13%',
      mutedForeground: '220 12% 60%',
      accent: '213 94% 55%',
      accentForeground: '220 25% 6%',
      destructive: '0 62% 30%',
      destructiveForeground: '220 15% 95%',
      border: '220 15% 19%',
      input: '220 15% 15%',
      ring: '213 94% 55%',
      surfaceBackground: '220 25% 4%',
      zap: '45 93% 47%',
      repost: '142 71% 45%',
      bookmark: '346 86% 56%',
      comment: '217 91% 60%',
      noteHover: '220 20% 8%'
    },
    style: {
      radius: '1rem',
      scanlineOpacity: '0',
      bgGradient: 'none',
      textShadow: 'none',
      fontFamily: '',
      meshOpacity: '1',
      cardBorderWidth: '0px'
    }
  },
  amethyst: {
    name: 'Amethyst',
    colors: {
      background: '270 20% 6%',
      foreground: '270 15% 95%',
      card: '270 15% 9%',
      cardForeground: '270 15% 95%',
      popover: '270 15% 11%',
      popoverForeground: '270 15% 95%',
      primary: '271 81% 60%',
      primaryHover: '271 81% 68%',
      primaryForeground: '270 20% 6%',
      secondary: '270 15% 15%',
      secondaryForeground: '270 15% 95%',
      muted: '270 15% 13%',
      mutedForeground: '270 12% 60%',
      accent: '271 81% 60%',
      accentForeground: '270 20% 6%',
      destructive: '0 62% 30%',
      destructiveForeground: '270 15% 95%',
      border: '270 15% 19%',
      input: '270 15% 15%',
      ring: '271 81% 60%',
      surfaceBackground: '270 20% 4%',
      zap: '45 93% 47%',
      repost: '142 71% 45%',
      bookmark: '346 86% 56%',
      comment: '217 91% 60%',
      noteHover: '270 15% 8%'
    },
    style: {
      radius: '1rem',
      scanlineOpacity: '0',
      bgGradient: 'none',
      textShadow: 'none',
      fontFamily: '',
      meshOpacity: '1',
      cardBorderWidth: '0px'
    }
  },
  hackerman: {
    name: 'Hackerman',
    colors: {
      background: '0 0% 0%',
      foreground: '120 30% 85%',
      card: '120 5% 3%',
      cardForeground: '120 30% 85%',
      popover: '120 5% 4%',
      popoverForeground: '120 30% 85%',
      primary: '120 70% 45%',
      primaryHover: '120 70% 55%',
      primaryForeground: '0 0% 0%',
      secondary: '120 10% 10%',
      secondaryForeground: '120 30% 85%',
      muted: '120 10% 8%',
      mutedForeground: '120 15% 45%',
      accent: '120 70% 45%',
      accentForeground: '0 0% 0%',
      destructive: '0 60% 30%',
      destructiveForeground: '120 30% 85%',
      border: '120 15% 12%',
      input: '120 10% 8%',
      ring: '120 70% 45%',
      surfaceBackground: '0 0% 0%',
      zap: '50 80% 40%',
      repost: '120 50% 35%',
      bookmark: '340 60% 45%',
      comment: '180 50% 40%',
      noteHover: '120 5% 2%'
    },
    style: {
      radius: '0px',
      scanlineOpacity: '0.08',
      bgGradient: 'none',
      textShadow: '0 0 4px hsl(var(--primary) / 0.5), 0 0 10px hsl(var(--primary) / 0.2)',
      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", "Consolas", "Courier New", monospace',
      meshOpacity: '0.3',
      cardBorderWidth: '1px'
    }
  },
  phosphor: {
    name: 'Phosphor',
    colors: {
      background: '0 0% 0%',
      foreground: '40 90% 75%',
      card: '40 10% 3%',
      cardForeground: '40 90% 75%',
      popover: '40 10% 4%',
      popoverForeground: '40 90% 75%',
      primary: '40 95% 50%',
      primaryHover: '40 95% 60%',
      primaryForeground: '0 0% 0%',
      secondary: '40 10% 10%',
      secondaryForeground: '40 90% 75%',
      muted: '40 10% 8%',
      mutedForeground: '40 15% 45%',
      accent: '40 95% 50%',
      accentForeground: '0 0% 0%',
      destructive: '0 60% 30%',
      destructiveForeground: '40 90% 75%',
      border: '40 15% 12%',
      input: '40 10% 8%',
      ring: '40 95% 50%',
      surfaceBackground: '0 0% 0%',
      zap: '50 80% 40%',
      repost: '40 50% 35%',
      bookmark: '340 60% 45%',
      comment: '180 50% 40%',
      noteHover: '40 5% 2%'
    },
    style: {
      radius: '0px',
      scanlineOpacity: '0.08',
      bgGradient: 'none',
      textShadow: '0 0 4px hsl(var(--primary) / 0.5), 0 0 10px hsl(var(--primary) / 0.2)',
      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", "Consolas", "Courier New", monospace',
      meshOpacity: '0.3',
      cardBorderWidth: '1px'
    }
  },
  smolder: {
    name: 'Smolder',
    colors: {
      background: '0 0% 0%',
      foreground: '15 80% 85%',
      card: '15 10% 3%',
      cardForeground: '15 80% 85%',
      popover: '15 10% 4%',
      popoverForeground: '15 80% 85%',
      primary: '15 90% 55%',
      primaryHover: '15 90% 65%',
      primaryForeground: '0 0% 0%',
      secondary: '15 10% 10%',
      secondaryForeground: '15 80% 85%',
      muted: '15 10% 8%',
      mutedForeground: '15 15% 45%',
      accent: '15 90% 55%',
      accentForeground: '0 0% 0%',
      destructive: '0 70% 40%',
      destructiveForeground: '15 80% 85%',
      border: '15 20% 15%',
      input: '15 10% 8%',
      ring: '15 90% 55%',
      surfaceBackground: '0 0% 0%',
      zap: '45 93% 47%',
      repost: '30 80% 40%',
      bookmark: '350 90% 55%',
      comment: '15 70% 50%',
      noteHover: '15 5% 2%'
    },
    style: {
      radius: '0.5rem',
      scanlineOpacity: '0',
      bgGradient: 'none',
      textShadow: '0 0 5px hsl(var(--primary) / 0.4), 0 0 12px hsl(var(--primary) / 0.2)',
      fontFamily: '',
      meshOpacity: '0.35',
      cardBorderWidth: '1px'
    }
  },
  midnight: {
    name: 'Midnight',
    colors: {
      background: '230 25% 4%',
      foreground: '220 15% 88%',
      card: '230 20% 7%',
      cardForeground: '220 15% 88%',
      popover: '230 20% 8%',
      popoverForeground: '220 15% 88%',
      primary: '45 80% 70%',
      primaryHover: '45 80% 78%',
      primaryForeground: '230 25% 4%',
      secondary: '230 10% 14%',
      secondaryForeground: '220 15% 88%',
      muted: '230 10% 11%',
      mutedForeground: '230 8% 50%',
      accent: '45 80% 70%',
      accentForeground: '230 25% 4%',
      destructive: '0 50% 30%',
      destructiveForeground: '220 15% 88%',
      border: '230 12% 15%',
      input: '230 10% 12%',
      ring: '45 80% 70%',
      surfaceBackground: '230 25% 2.5%',
      zap: '45 70% 55%',
      repost: '160 40% 45%',
      bookmark: '340 40% 50%',
      comment: '210 50% 55%',
      noteHover: '230 15% 5.5%'
    },
    style: {
      radius: '1rem',
      scanlineOpacity: '0',
      bgGradient: 'none',
      textShadow: 'none',
      fontFamily: '',
      meshOpacity: '0.8',
      cardBorderWidth: '0px'
    }
  }
} as const
export type TThemeName = keyof typeof THEME_COLORS

export const LONG_PRESS_THRESHOLD = 400

export const SPAMMER_PERCENTILE_THRESHOLD = 60

export const SPECIAL_TRUST_SCORE_FILTER_ID = {
  DEFAULT: 'default',
  INTERACTIONS: 'interactions',
  NOTIFICATIONS: 'notifications',
  SEARCH: 'search',
  HASHTAG: 'hashtag',
  NAK: 'nak',
  TRENDING: 'trending'
}

export const COMMUNITY_RELAY_SETS = import.meta.env.VITE_COMMUNITY_RELAY_SETS as TRelaySet[]
export const COMMUNITY_RELAYS = import.meta.env.VITE_COMMUNITY_RELAYS as string[]

export const IS_COMMUNITY_MODE = COMMUNITY_RELAY_SETS.length > 0 || COMMUNITY_RELAYS.length > 0
