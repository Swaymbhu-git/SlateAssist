import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { fetchAiResponse, handleApiError } from '../../services/api';
import '../../assets/ChatDrawer.css'; // <-- IMPORT THE CSS HERE

const ChatDrawer = ({ isOpen, onClose, editorCode, executionInput, executionOutput }) => {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        const newUserMessage = { sender: 'user', text: userInput };
        setMessages((prev) => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);

        const prompt = `
            You are an expert AI programming assistant.
            A user is asking for help with the following C++ code.
            --- CODE ---
            \`\`\`cpp
            ${editorCode || '// No code in the editor.'}
            \`\`\`
            --- INPUT PROVIDED FOR EXECUTION ---
            ${executionInput || '// No input was provided.'}
            --- LAST EXECUTION OUTPUT / ERROR ---
            ${executionOutput || '// The code has not been run yet.'}
            Based on all of the information above, please answer the user's question.
            --- USER'S QUESTION ---
            ${userInput}
        `;

        try {
            const { data } = await fetchAiResponse(prompt);
            const botResponse = data.text || "No response from AI";
            const newBotMessage = { sender: 'bot', text: botResponse };
            setMessages((prev) => [...prev, newBotMessage]);
        } catch (error) {
            handleApiError(error);
            const errorMessage = { sender: 'bot', text: 'Sorry, I encountered an error communicating with the AI.' };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`drawer-content ${isOpen ? 'open' : ''}`}>
            <div className="modal-header">
                <h2>Ask AI Assistant</h2>
                <button className="close-button" onClick={onClose}>&times;</button>
            </div>
            <div className="chat-window">
                {messages.length === 0 && (
                    <div className="empty-chat-message">
                        <p>Ask a question about your code to get started!</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                       <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                ))}
                {isLoading && <div className="message bot typing"><span></span><span></span><span></span></div>}
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="ex- Explain the main function."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>→</button>
            </form>
        </div>
    );
};

export default ChatDrawer;