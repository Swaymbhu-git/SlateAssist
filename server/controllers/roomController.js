import Room from '../models/Room.js';
import User from '../models/User.js';
import axios from 'axios';

// --- Room Management ---

export const getRoom = async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.status(404).json({ message: 'Room not found.' });
        }
        if (!room.members.map(id => id.toString()).includes(req.user.id)) {
            return res.status(403).json({ message: 'You are not a member of this room.' });
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createRoom = async (req, res) => {
    try {
        const { roomId } = req.body;
        const ownerId = req.user.id;
        const newRoom = new Room({ roomId, owner: ownerId, members: [ownerId] });
        await newRoom.save();
        res.status(201).json(newRoom);
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ message: 'Server error while creating room.' });
    }
};

export const inviteUser = async (req, res) => {
    try {
        const { roomId, inviteeEmail } = req.body;
        const ownerId = req.user.id;
        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        if (!room.owner.equals(ownerId)) {
            return res.status(403).json({ message: 'Only the room owner can invite users.' });
        }

        const invitee = await User.findOne({ email: inviteeEmail });
        if (!invitee) return res.status(404).json({ message: 'User to invite not found.' });

        if (!room.members.some(memberId => memberId.equals(invitee._id))) {
            room.members.push(invitee._id);
            await room.save();
        }
        
        res.json({ message: 'User invited successfully.' });
    } catch (error) {
        console.error('Invite Error:', error);
        res.status(500).json({ message: 'Server error during invite.' });
    }
};


export const kickUser = async (req, res) => {
    try {
        const { roomId, userIdToKick } = req.body;
        const ownerId = req.user.id;

        const room = await Room.findOne({ roomId });
        if (!room) return res.status(404).json({ message: 'Room not found.' });
        
        // CORRECTED: Use .equals() for reliable ownership check
        if (!room.owner.equals(ownerId)) {
            return res.status(403).json({ message: 'Only the room owner can kick users.' });
        }
        if (ownerId === userIdToKick) return res.status(400).json({ message: 'Owner cannot be kicked.' });

        room.members.pull(userIdToKick);
        await room.save();
        
        res.json({ message: 'User access revoked. They will be disconnected shortly.' });
    } catch (error) {
        console.error('Kick error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- Secure API Proxies ---

export const runCode = async (req, res) => {
    const { language_id, source_code, stdin } = req.body;
    const options = {
        method: 'POST',
        url: 'https://judge0-ce.p.rapidapi.com/submissions',
        params: { base64_encoded: 'true', wait: 'true' },
        headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
        data: { language_id, source_code, stdin },
    };

    try {
        const response = await axios.request(options);
        res.json(response.data);
    } catch (error) {
        console.error('RapidAPI Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error executing code via external service.' });
    }
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const askAi = async (req, res) => {
    const { prompt } = req.body;

    // Validate request
    if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
    }

    try {
        // Use the new SDK method
        const response = await ai.models.generateContent({
            // 'gemini-2.0-flash' is the recommended fast model for late 2025
            // If you specifically want the preview, use: 'gemini-3-pro-preview'
            model: "gemini-2.5-flash-lite", 
            contents: prompt, 
        });

        // The new SDK simplifies the response parsing (response.text)
        console.log("response is: ")
        // console.log('Gemini SDK Response:', response.candidates[0].content.parts[0].text);
        const text = response?.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("") || "";

        res.json({
        text,                            
        finishReason: response?.candidates?.[0]?.finishReason,
        modelVersion: response?.modelVersion,
        usage: response?.usageMetadata
        });

    } catch (error) {
        console.error('Gemini SDK Error:', error);
        
        // Handle specific API errors
        res.status(500).json({ 
            message: 'Error communicating with AI assistant.',
            details: error.message 
        });
    }
};