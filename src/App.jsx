import { useState } from "react";
import "./App.css";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import OpenAI from "openai";

const API_KEY = "";

const openai = new OpenAI({ apiKey: API_KEY, dangerouslyAllowBrowser: true });

function App() {
  const [messages, setMessages] = useState([
    {
      message: "Hello, I'm your Holiday Booking Assistant! Let's get started.",
      sentTime: "just now",
      sender: "ChatGPT",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const checkRoomAvailability = (
    hotelName,
    checkInDate,
    checkOutDate,
    roomType
  ) => {
    // Dummy data for demonstration purposes
    return JSON.stringify({
      hotelName,
      checkInDate,
      checkOutDate,
      roomType,
      available: true,
    });
  };

  const makeReservation = (
    hotelName,
    checkInDate,
    checkOutDate,
    roomType,
    guestName
  ) => {
    // Dummy data for demonstration purposes
    return JSON.stringify({
      hotelName,
      checkInDate,
      checkOutDate,
      roomType,
      guestName,
      reservationStatus: "confirmed",
      reservationId: "123456",
    });
  };

  const handleSend = async (message) => {
    const newMessage = {
      message,
      direction: "outgoing",
      sender: "user",
    };

    const newMessages = [...messages, newMessage];

    setMessages(newMessages);
    setIsTyping(true);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: newMessages.map((msg) => ({
        role: msg.sender === "ChatGPT" ? "assistant" : "user",
        content: msg.message,
      })),
      tools: [
        {
          type: "function",
          function: {
            name: "check_room_availability",
            description: "Check the availability of rooms in a given hotel",
            parameters: {
              type: "object",
              properties: {
                hotelName: {
                  type: "string",
                  description: "The name of the hotel",
                },
                checkInDate: {
                  type: "string",
                  description: "Check-in date in YYYY-MM-DD format",
                },
                checkOutDate: {
                  type: "string",
                  description: "Check-out date in YYYY-MM-DD format",
                },
                roomType: { type: "string", description: "Type of room" },
              },
              required: [
                "hotelName",
                "checkInDate",
                "checkOutDate",
                "roomType",
              ],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "make_reservation",
            description: "Make a reservation at a hotel",
            parameters: {
              type: "object",
              properties: {
                hotelName: {
                  type: "string",
                  description: "The name of the hotel",
                },
                checkInDate: {
                  type: "string",
                  description: "Check-in date in YYYY-MM-DD format",
                },
                checkOutDate: {
                  type: "string",
                  description: "Check-out date in YYYY-MM-DD format",
                },
                roomType: { type: "string", description: "Type of room" },
                guestName: { type: "string", description: "Name of the guest" },
              },
              required: [
                "hotelName",
                "checkInDate",
                "checkOutDate",
                "roomType",
                "guestName",
              ],
            },
          },
        },
      ],
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    const toolCalls = responseMessage.tool_calls;
    if (toolCalls) {
      const availableFunctions = {
        check_room_availability: checkRoomAvailability,
        make_reservation: makeReservation,
      };

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionToCall = availableFunctions[functionName];
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse = functionToCall(
          functionArgs.hotelName,
          functionArgs.checkInDate,
          functionArgs.checkOutDate,
          functionArgs.roomType,
          functionArgs.guestName
        );

        newMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResponse,
        });
      }

      const secondResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: newMessages.map((msg) => ({
          role: msg.sender === "ChatGPT" ? "assistant" : "user",
          content: msg.message,
        })),
      });

      setMessages([
        ...newMessages,
        {
          message: secondResponse.choices[0].message.content,
          sender: "ChatGPT",
        },
      ]);
    } else {
      setMessages([
        ...newMessages,
        {
          message: responseMessage.content,
          sender: "ChatGPT",
        },
      ]);
    }

    setIsTyping(false);
  };

  return (
    <div className="App">
      <div style={{ position: "relative", height: "800px", width: "700px" }}>
        <MainContainer>
          <ChatContainer>
            <MessageList
              scrollBehavior="smooth"
              typingIndicator={
                isTyping ? (
                  <TypingIndicator content="ChatGPT is typing" />
                ) : null
              }
            >
              {messages.map((message, i) => (
                <Message key={i} model={message} />
              ))}
            </MessageList>
            <MessageInput placeholder="Type message here" onSend={handleSend} />
          </ChatContainer>
        </MainContainer>
      </div>
    </div>
  );
}

export default App;
