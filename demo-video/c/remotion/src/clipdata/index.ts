import s2_open from "./s2_open.json";
import s3_edit from "./s3_edit.json";
import s4_slash from "./s4_slash.json";
import s5_tabs from "./s5_tabs.json";
import s6_diagrams from "./s6_diagrams.json";
import s7_review from "./s7_review.json";
import s8_nav from "./s8_nav.json";
export default { s2_open, s3_edit, s4_slash, s5_tabs, s6_diagrams, s7_review, s8_nav } as Record<string, { cursor: number[][]; clicks: number[]; duration: number }>;
