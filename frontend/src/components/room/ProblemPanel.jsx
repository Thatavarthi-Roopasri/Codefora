import React, { useState } from 'react';
import { BookOpen, CheckCircle, HelpCircle } from 'lucide-react';

export function ProblemPanel({ problem }) {
  if (!problem) return null;

  return (
    <aside className="problem-panel tour-problem-left">
      <div className="problem-panel-header">
        <div className="toolbar-eyebrow">Collaborative Challenge</div>
        <h2>{problem.title}</h2>
        <div className="problem-panel-meta">
          <span className={`difficulty-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
          <span>{problem.acceptance}% acceptance</span>
        </div>
      </div>

      <div className="problem-panel-scroll">
        <div className="problem-section">
          <p>{problem.statement}</p>
        </div>

        <div className="problem-section">
          <h3>Constraints</h3>
          <ul>
            {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>

        <div className="problem-section">
          <h3>Sample Test Cases</h3>
          {problem.tests.slice(0, 4).map((test, i) => (
            <div key={i} className="sample-case-mini">
              <strong>Sample {i + 1}</strong>
              <div className="sample-io">
                <div>
                  <small>Input</small>
                  <pre>{test.input}</pre>
                </div>
                <div>
                  <small>Output</small>
                  <pre>{test.output}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
