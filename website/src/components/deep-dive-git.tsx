"use client";

import { useEffect, useState } from "react";
import { SHOWCASE_AGENT_FLOWS } from "@/lib/constants";
import { AppFrame } from "./showcase/app-frame";
import { FakeSessionHeader } from "./showcase/fake-session-header";
import { FakeAgentMessages } from "./showcase/fake-agent-cell";
import { FakePromptInput } from "./showcase/fake-prompt-input";
import { FakeCommitModal } from "./showcase/fake-commit-modal";

export function DeepDiveGit() {
  const [showModal, setShowModal] = useState(false);
  const [typing, setTyping] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [msgCount, setMsgCount] = useState(0);

  useEffect(() => {
    const maxLen = SHOWCASE_AGENT_FLOWS[0].length;
    let count = 0;
    const msgInterval = setInterval(() => {
      count++;
      setMsgCount(count);
      if (count >= maxLen) clearInterval(msgInterval);
    }, 350);

    const t1 = setTimeout(() => setShowModal(true), 2500);
    const t2 = setTimeout(() => setTyping(true), 3000);
    const t3 = setTimeout(() => setCommitted(true), 5000);
    const t4 = setTimeout(() => {
      setShowModal(false);
      setPushed(true);
    }, 5500);

    return () => {
      clearInterval(msgInterval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <AppFrame>
      <div className="h-[280px] flex flex-col relative">
        <FakeSessionHeader
          slug="auth-middleware"
          branch="feat/auth"
          baseBranch="main"
          status="running"
        />
        <FakeAgentMessages
          messages={SHOWCASE_AGENT_FLOWS[0]}
          visibleCount={msgCount}
        />
        <FakePromptInput isBusy={msgCount < SHOWCASE_AGENT_FLOWS[0].length} />
        {pushed && (
          <div className="absolute top-1 right-2 z-10">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
              pushed
            </span>
          </div>
        )}
        <FakeCommitModal
          visible={showModal}
          typingActive={typing}
          committed={committed}
        />
      </div>
    </AppFrame>
  );
}
