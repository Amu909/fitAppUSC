function sanitizeSuggestionText(suggestion) {
  return suggestion
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildChatPayload(messageText, messages, userProfile) {
  return {
    message: messageText,
    conversation_history: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    user_profile: userProfile,
  };
}

module.exports = {
  buildChatPayload,
  sanitizeSuggestionText,
};
