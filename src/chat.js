import OpenAI from "openai";
const openai = new OpenAI();

function checkRoomAvailability(hotelName, checkInDate, checkOutDate, roomType) {
  return JSON.stringify({
    hotelName,
    checkInDate,
    checkOutDate,
    roomType,
    available: true,
  });
}

function makeReservation(
  hotelName,
  checkInDate,
  checkOutDate,
  roomType,
  guestName
) {
  return JSON.stringify({
    hotelName,
    checkInDate,
    checkOutDate,
    roomType,
    guestName,
    reservationStatus: "confirmed",
    reservationId: "123456",
  });
}

async function runHotelReservationBot() {
  const messages = [
    {
      role: "user",
      content: "I want to book a room at the Hilton from July 1st to July 5th.",
    },
  ];
  const tools = [
    {
      type: "function",
      function: {
        name: "check_room_availability",
        description: "Check the availability of rooms in a given hotel",
        parameters: {
          type: "object",
          properties: {
            hotelName: { type: "string", description: "The name of the hotel" },
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
          required: ["hotelName", "checkInDate", "checkOutDate", "roomType"],
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
            hotelName: { type: "string", description: "The name of the hotel" },
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
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages,
    tools: tools,
    tool_choice: "auto",
  });
  const responseMessage = response.choices[0].message;

  const toolCalls = responseMessage.tool_calls;
  if (responseMessage.tool_calls) {
    const availableFunctions = {
      check_room_availability: checkRoomAvailability,
      make_reservation: makeReservation,
    };
    messages.push(responseMessage);
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
      messages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: functionName,
        content: functionResponse,
      });
    }
    const secondResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
    }); // get a new response from the model where it can see the function response
    return secondResponse.choices;
  }
}

runHotelReservationBot().then(console.log).catch(console.error);
