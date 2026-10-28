import React from "react";
import { AbsoluteFill, Composition } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { SceneDef, SCENES, CUT_SCENES, CUT_TITLE, CUT_END, TITLE_SEC, END_SEC, TRANSITION, CUT_TRANSITION, FPS, W, H, sceneDur, timeline, absoluteSubs } from "./data.ts";
import { Scene } from "./Scene.tsx";
import { TitleCard, EndCard } from "./Cards.tsx";
import { Subtitles } from "./Subtitles.tsx";

const f = (s: number) => Math.round(s * FPS);

const Film: React.FC<{ scenes: SceneDef[]; title: number; end: number; compact?: boolean; subtitles: boolean }> = ({ scenes, title, end, compact, subtitles }) => {
  const trs = compact ? CUT_TRANSITION : TRANSITION;
  const tr = f(trs);
  const presentations: any[] = [fade(), slide({ direction: "from-right" }), fade(), wipe({ direction: "from-left" }), slide({ direction: "from-bottom" }), fade(), slide({ direction: "from-right" }), fade()];
  const items: React.ReactNode[] = [];
  items.push(<TransitionSeries.Sequence key="title" durationInFrames={f(title)}><TitleCard compact={compact} /></TransitionSeries.Sequence>);
  scenes.forEach((sc, i) => {
    items.push(<TransitionSeries.Transition key={`t${i}`} presentation={compact ? fade() : presentations[i % presentations.length]} timing={linearTiming({ durationInFrames: tr })} />);
    items.push(<TransitionSeries.Sequence key={sc.id + i} durationInFrames={f(sceneDur(sc))}><Scene sc={sc} index={compact ? -1 : i} /></TransitionSeries.Sequence>);
  });
  items.push(<TransitionSeries.Transition key="te" presentation={fade()} timing={linearTiming({ durationInFrames: tr })} />);
  items.push(<TransitionSeries.Sequence key="end" durationInFrames={f(end)}><EndCard compact={compact} /></TransitionSeries.Sequence>);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <TransitionSeries>{items}</TransitionSeries>
      {subtitles && <Subtitles subs={absoluteSubs(scenes, title, end, trs)} />}
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => {
  const main = timeline(SCENES, TITLE_SEC, END_SEC);
  const cut = timeline(CUT_SCENES, CUT_TITLE, CUT_END, CUT_TRANSITION);
  return (
    <>
      <Composition id="Demo" component={() => <Film scenes={SCENES} title={TITLE_SEC} end={END_SEC} subtitles />} width={W} height={H} fps={FPS} durationInFrames={f(main.total)} />
      <Composition id="DemoSilentNoSubs" component={() => <Film scenes={SCENES} title={TITLE_SEC} end={END_SEC} subtitles={false} />} width={W} height={H} fps={FPS} durationInFrames={f(main.total)} />
      <Composition id="Cut15" component={() => <Film scenes={CUT_SCENES} title={CUT_TITLE} end={CUT_END} compact subtitles />} width={W} height={H} fps={FPS} durationInFrames={f(cut.total)} />
    </>
  );
};
