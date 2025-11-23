import React, { useState } from 'react';
import { parseRankText } from '../logic/parser';
import { Copy, Check } from 'lucide-react';
import './RankParser.scss';

const RankParser = () => {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleParse = () => {
        const result = parseRankText(input);
        if (result) {
            setOutput(JSON.stringify(result, null, 2));
        } else {
            alert("Could not parse the text. Please check the format.");
        }
    };

    const handleCopy = () => {
        if (output) {
            navigator.clipboard.writeText(output);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="rank-parser">
            <h3>Rank Parser Tool</h3>
            <p className="desc">Paste the raw tournament rankings below to generate the JSON code.</p>

            <textarea
                placeholder={`08/12/2025\n1. Player A\n2. Player B...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />

            <button className="parse-btn" onClick={handleParse}>
                Generate JSON
            </button>

            {output && (
                <div className="output-area">
                    <div className="output-header">
                        <span>Generated JSON</span>
                        <button className="copy-btn" onClick={handleCopy}>
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <pre>{output}</pre>
                </div>
            )}
        </div>
    );
};

export default RankParser;
