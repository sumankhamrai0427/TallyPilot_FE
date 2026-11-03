import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Sparkles, MessageSquare, Plus, 
  CheckCircle, AlertCircle, Scale, TrendingUp, Building,
  ArrowRight, User, Terminal, Paperclip, X, FileText
} from 'lucide-react';
import { api } from '../services/api';
import { ChatSessionItem, ChatMessageItem } from '../types';

export const AIAssistantPage: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSessions = async () => {
    try {
      const sList = await api.getAssistantSessions();
      setSessions(sList);
      if (sList.length > 0 && !activeSessionId) {
        selectSession(sList[0].id);
      }
    } catch (err) {
      console.error('Error fetching chat sessions:', err);
    }
  };

  const selectSession = async (sessionId: number) => {
    setActiveSessionId(sessionId);
    try {
      const hist = await api.getAssistantHistory(sessionId);
      setMessages(hist.messages || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const startNewSession = () => {
    setActiveSessionId(null);
    setMessages([
      {
        id: 0,
        sender: 'ASSISTANT',
        content: 'Hello! I am your Accounting Assistant. How can I assist you with your books, vouchers, or reports today?',
        created_at: new Date().toISOString()
      }
    ]);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || inputPrompt;
    if ((!promptToSend.trim() && !attachedFile) || isSending) return;

    const fileToUpload = attachedFile;
    const tempUserMsgContent = promptToSend + (fileToUpload ? `\n📎 [Attached: ${fileToUpload.name}]` : '');

    const tempUserMsg: ChatMessageItem = {
      id: Date.now(),
      sender: 'USER',
      content: tempUserMsgContent,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputPrompt('');
    setAttachedFile(null);
    setIsSending(true);

    try {
      const res = await api.sendAssistantMessage({
        message: promptToSend || (fileToUpload ? `Please analyze and summarize the attached financial document: ${fileToUpload.name}` : ''),
        session_id: activeSessionId,
        file: fileToUpload
      });

      if (!activeSessionId) {
        setActiveSessionId(res.session_id);
        loadSessions();
      }

      const assistantMsg: ChatMessageItem = {
        id: Date.now() + 1,
        sender: 'ASSISTANT',
        content: res.reply,
        tool_calls: res.tool_calls,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessageItem = {
        id: Date.now() + 1,
        sender: 'ASSISTANT',
        content: `Error: ${err.response?.data?.detail || err.message || 'Failed to connect to local assistant.'}`,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    'Trial balance status',
    'Profit and loss summary',
    'What is the balance of HDFC Bank?',
    'List all payments made today',
  ];

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-4 overflow-hidden">
      {/* Sessions Left Sidebar */}
      <div className="w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <Bot className="w-4 h-4 text-blue-600" />
            <span>Conversations</span>
          </div>
          <button
            onClick={startNewSession}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="p-4 text-xs text-slate-400 text-center">No chat history yet.</div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s.id)}
                className={`w-full text-left p-3 rounded-xl text-xs font-semibold truncate transition-colors flex items-center gap-2 cursor-pointer ${
                  activeSessionId === s.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{s.title}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xs">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Accounting Assistant
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">Natural language double-entry commands & instant reporting</p>
            </div>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === 'USER';
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs ${
                  isUser ? 'bg-indigo-600' : 'bg-blue-600'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-2">
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none whitespace-pre-line'
                  }`}>
                    {m.content}
                  </div>

                  {/* Tool Call Output Pill if any */}
                  {m.tool_calls && m.tool_calls.tool && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-blue-500" />
                      <span>Executed Tool: <strong>{m.tool_calls.tool}</strong></span>
                    </div>
                  )}

                  {/* HLA 9.3 Interactive Voucher Review Card */}
                  {m.tool_calls?.result?.vouchers && m.tool_calls.result.vouchers.length > 0 && (
                    <div className="mt-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2 max-w-xl">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Pending Voucher Approval Review ({m.tool_calls.result.vouchers.length})
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-full font-semibold">
                          Awaiting Post
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                              <th className="py-1 font-medium">Voucher #</th>
                              <th className="py-1 font-medium">Type</th>
                              <th className="py-1 font-medium">Debit / Credit</th>
                              <th className="py-1 font-medium text-right">Amount</th>
                              <th className="py-1 font-medium text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {m.tool_calls.result.vouchers.map((v: any) => (
                              <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-2 font-mono font-semibold text-blue-600 dark:text-blue-400">{v.voucher_number}</td>
                                <td className="py-2">{v.voucher_type}</td>
                                <td className="py-2 text-slate-600 dark:text-slate-300">
                                  <div>Dr: {v.debit_ledger}</div>
                                  <div className="text-[10px] text-slate-400">Cr: {v.credit_ledger}</div>
                                </td>
                                <td className="py-2 text-right font-semibold">₹{v.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="py-2 text-right space-x-1">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.postVoucher(v.id);
                                        handleSend(undefined, `Show me the vouchers that need approval`);
                                      } catch (err: any) {
                                        alert(err.response?.data?.detail || err.message);
                                      }
                                    }}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    Post
                                  </button>
                                  <button
                                    onClick={() => {
                                      setInputPrompt(`Change the expense ledger in voucher ${v.voucher_number} to `);
                                    }}
                                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* HLA 9.3 Single Voucher Mutation Card */}
                  {m.tool_calls?.result?.voucher && (
                    <div className="mt-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 text-xs max-w-md space-y-1">
                      <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-300">
                        <span>Voucher Card: {m.tool_calls.result.voucher.voucher_number}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded text-[10px]">
                          {m.tool_calls.result.voucher.status}
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        <div><strong>Debit (Dr):</strong> {m.tool_calls.result.voucher.debit_ledger}</div>
                        <div><strong>Credit (Cr):</strong> {m.tool_calls.result.voucher.credit_ledger}</div>
                        <div><strong>Amount:</strong> ₹{m.tool_calls.result.voucher.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={async () => {
                            try {
                              await api.postVoucher(m.tool_calls.result.voucher.id);
                              handleSend(undefined, `What is the balance of ${m.tool_calls.result.voucher.debit_ledger}?`);
                            } catch (err: any) {
                              alert(err.response?.data?.detail || err.message);
                            }
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition-colors cursor-pointer"
                        >
                          Approve & Post to General Ledger
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="flex gap-3 mr-auto items-center text-slate-400 text-xs italic">
              <Bot className="w-4 h-4 animate-spin text-blue-600" />
              <span>Analyzing financial books and executing accounting logic...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Chips */}
        <div className="px-6 py-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
            Quick Inquiries:
          </span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(undefined, p)}
              className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full whitespace-nowrap cursor-pointer transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Attached File Preview Pill */}
        {attachedFile && (
          <div className="px-6 py-2 bg-blue-50/80 dark:bg-blue-950/40 border-t border-blue-100 dark:border-blue-900/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-medium">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Attached: <strong>{attachedFile.name}</strong> ({(attachedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Box */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setAttachedFile(e.target.files[0]);
              }
            }}
            accept=".xlsx,.xls,.csv,.pdf,.txt"
            className="hidden"
          />

          <input
            type="text"
            placeholder={attachedFile ? `Add instructions for ${attachedFile.name} (or hit send)...` : "Ask about your books, vouchers, or attach a document..."}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isSending}
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />

          {/* Attach Button (Right side beside send button) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach document (.xlsx, .xls, .csv, .pdf, .txt)"
            className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputPrompt.trim() && !attachedFile) || isSending}
            className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all cursor-pointer flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

