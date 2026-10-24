/**
 * The emoji of the palette's emoji picker, by category. Pure data: no host API, no DOM, no Node
 * built-ins.
 */

/** One emoji of the picker: the Unicode character and its English name (used by the filter). */
export interface EmojiEntry {
  /** The character the action inserts. */
  char: string;
  /** The English name the filter matches. */
  name: string;
}

/** One tab of the picker. */
export interface EmojiCategory {
  /** Stable id of the tab. */
  id: string;
  /** The tab label. */
  label: string;
  /** The emoji of the tab, in display order. */
  items: EmojiEntry[];
}

// Plain data: "<character> <english name>" per entry, no network, Unicode only (flags are left out
// on purpose). The filter matches the words of the name.
const EMOJI_SOURCE: Array<[string, string, string]> = [
  ["smileys", "Smileys", "😀 grinning face;😃 smiling face with big eyes;😄 smiling face with smiling eyes;"
    + "😁 beaming face;😆 grinning squinting face laugh;😅 grinning face with sweat;"
    + "😂 face with tears of joy;🙂 slightly smiling face;🙃 upside-down face;😉 winking face;"
    + "😊 smiling face with blush;😇 smiling face with halo angel;😍 smiling face with heart eyes;"
    + "🤩 star-struck;😘 face blowing a kiss;😋 face savoring food yum;😎 smiling face with sunglasses cool;"
    + "🤔 thinking face;😐 neutral face;😴 sleeping face;"
    + "😢 crying face sad;😭 loudly crying face;😡 pouting face angry;😱 face screaming in fear;"
    + "🤯 exploding head mind blown;🥳 partying face"],
  ["people", "People and hands", "👍 thumbs up like;👎 thumbs down dislike;👏 clapping hands applause;"
    + "🙌 raising hands celebration;🙏 folded hands please thanks pray;🤝 handshake agreement;"
    + "👋 waving hand hello;✋ raised hand stop;👌 ok hand;✌️ victory hand peace;🤞 crossed fingers luck;"
    + "👉 backhand index pointing right;👈 backhand index pointing left;👆 backhand index pointing up;"
    + "👇 backhand index pointing down;💪 flexed biceps strong;🤷 person shrugging;🤦 person facepalming;"
    + "🙋 person raising hand;👀 eyes look;🧠 brain;👤 bust in silhouette user;"
    + "👨‍💻 man technologist;👩‍💻 woman technologist"],
  ["nature", "Nature", "🌱 seedling sprout;🌲 evergreen tree;🌳 deciduous tree;"
    + "🌸 cherry blossom;🌹 rose;🌻 sunflower;🍀 four leaf clover;🍁 maple leaf;🔥 fire flame;"
    + "💧 droplet water;🌊 water wave;⚡ high voltage lightning;☀️ sun;🌙 crescent moon;⭐ star;"
    + "🌟 glowing star;❄️ snowflake;🌈 rainbow;☁️ cloud;🐛 bug insect;🐞 lady beetle;🐝 honeybee;"
    + "🦋 butterfly;🐙 octopus;🐧 penguin;🦊 fox;🐱 cat face"],
  ["food", "Food and drink", "🍎 red apple;🍏 green apple;🍌 banana;🍇 grapes;🍓 strawberry;🍋 lemon;"
    + "🥑 avocado;🥕 carrot;🌽 ear of corn;🍞 bread;🧀 cheese wedge;🍕 pizza;🍔 hamburger;🍟 french fries;"
    + "🌮 taco;🍣 sushi;🍪 cookie;🍰 shortcake cake;🍫 chocolate bar;🍩 doughnut;☕ hot beverage coffee;"
    + "🍵 teacup tea;🍺 beer mug;🍷 wine glass"],
  ["objects", "Objects", "💻 laptop computer;🖥️ desktop computer;⌨️ keyboard;📱 mobile phone;"
    + "💡 light bulb idea;🔧 wrench tool;🔨 hammer;⚙️ gear settings;🔒 locked padlock;🔓 unlocked padlock;"
    + "🔑 key;📁 file folder;📂 open file folder;📄 page facing up document;📝 memo note;"
    + "📎 paperclip;📅 calendar;📊 bar chart;📈 chart increasing;📉 chart decreasing;🔍 magnifying glass search;"
    + "📦 package box;🚀 rocket launch;🎯 direct hit target;🎉 party popper tada;🏆 trophy;"
    + "📚 books;🔔 bell notification"],
  ["symbols", "Symbols and status", "✅ check mark button done;☑️ check box with check;✔️ check mark;"
    + "❌ cross mark;❎ cross mark button;⚠️ warning;🚫 prohibited;⛔ no entry;❗ red exclamation mark;"
    + "❓ red question mark;ℹ️ information;➕ plus;➖ minus;➡️ right arrow;⬅️ left arrow;⬆️ up arrow;"
    + "⬇️ down arrow;🔄 counterclockwise arrows button refresh;🔁 repeat button;❤️ red heart;💔 broken heart;"
    + "💯 hundred points;🆗 ok button;🔴 red circle;"
    + "🟢 green circle;🔵 blue circle"],
];

/** The categories of the picker, in tab order. */
export const EMOJI_CATEGORIES: EmojiCategory[] = EMOJI_SOURCE.map(([id, label, list]) => ({
  id,
  label,
  items: list.split(";").map((entry) => {
    const space = entry.indexOf(" ");
    return { char: entry.slice(0, space), name: entry.slice(space + 1) };
  }),
}));
