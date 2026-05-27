import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAiStatus, requestChatMessage, requestChatSuggestions } from '../utils/aiClient';
import { useTheme } from '../ThemeContext';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content:
    'Hola, soy FitBot. Estoy listo para ayudarte con nutricion, rutinas, progreso y decisiones diarias para que tu plan sea mas claro y sostenible.',
  timestamp: new Date(),
};

const sanitizeSuggestionText = (suggestion) =>
  suggestion
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

const buildChatPayload = (messageText, messages, userProfile) => ({
  message: messageText,
  conversation_history: messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  })),
  user_profile: userProfile,
});

function FitBotLogo({ size = 42, compact = false }) {
  const headSize = size * 0.5;
  const eyeWidth = headSize * 0.14;
  const eyeHeight = headSize * 0.2;

  return (
    <View
      style={[
        styles.logoShell,
        {
          width: size,
          height: size,
          borderRadius: compact ? 14 : 18,
        },
      ]}
    >
      <View style={[styles.logoAntenna, { top: size * 0.08, height: size * 0.12 }]} />
      <View style={[styles.logoDot, { top: size * 0.02, width: size * 0.12, height: size * 0.12, borderRadius: size * 0.06 }]} />
      <View style={[styles.logoHead, { width: headSize, height: headSize, borderRadius: headSize * 0.3 }]}>
        <View style={[styles.logoEye, { width: eyeWidth, height: eyeHeight, borderRadius: eyeWidth / 2 }]} />
        <View style={[styles.logoEye, { width: eyeWidth, height: eyeHeight, borderRadius: eyeWidth / 2 }]} />
      </View>
      {!compact ? (
        <View style={styles.logoBodyRow}>
          <View style={styles.logoArm} />
          <Ionicons name="barbell" size={size * 0.28} color="#ffffff" />
          <View style={styles.logoArm} />
        </View>
      ) : null}
    </View>
  );
}

function AnimatedMessage({ children, isUser }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 240, useNativeDriver: false }),
      Animated.timing(scale, { toValue: 1, duration: 240, useNativeDriver: false }),
    ]).start();
  }, [opacity, scale, translateY]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }, { scale }],
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        width: '100%',
      }}
    >
      {children}
    </Animated.View>
  );
}

function TypingDots() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 500, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const middleOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.35, 1, 0.35],
  });

  return (
    <View style={styles.typingDots}>
      <View style={[styles.typingDot, { opacity: 0.45 }]} />
      <Animated.View style={[styles.typingDot, { opacity: middleOpacity }]} />
      <View style={[styles.typingDot, { opacity: 0.7 }]} />
    </View>
  );
}

const ChatbotScreen = ({ userProfile = null }) => {
  const { theme, isDark } = useTheme();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [aiReady, setAiReady] = useState(true);
  const scrollViewRef = useRef(null);

  const firstName =
    userProfile?.fullName?.trim()?.split(' ')?.[0] ||
    'Tu';

  const quickStatus = useMemo(() => {
    if (userProfile?.goal === 'gain_muscle') return 'Enfocado en ganancia muscular';
    if (userProfile?.goal === 'lose_weight') return 'Enfocado en perdida de grasa';
    if (userProfile?.goal === 'athletic') return 'Enfocado en rendimiento';
    return 'Listo para ayudarte hoy';
  }, [userProfile?.goal]);

  useEffect(() => {
    checkAiStatus();
    loadSuggestions();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 90);
  };

  const checkAiStatus = async () => {
    try {
      const status = await getAiStatus();
      setAiReady(Boolean(status?.configured));
    } catch (error) {
      setAiReady(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await requestChatSuggestions(userProfile);
      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Error cargando sugerencias:', error);
    }
  };

  const sendMessage = async (text = null) => {
    const messageText = (text || inputText).trim();
    if (!messageText || loading) return;
    if (!aiReady) {
      Alert.alert('FitBot', 'La IA no esta configurada en el backend. Define GROQ_API_KEY y reinicia el backend.');
      return;
    }

    const nextUserMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setInputText('');
    setLoading(true);
    scrollToBottom();

    try {
      const response = await requestChatMessage(
        buildChatPayload(messageText, messages, userProfile)
      );

      const botMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      if (response.suggestions) {
        setSuggestions(response.suggestions);
      }
      scrollToBottom();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: error.message || 'No pude responder en este momento. Reintenta en unos segundos para seguir con tu plan.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionPress = (suggestion) => {
    const cleanText = sanitizeSuggestionText(suggestion);
    sendMessage(cleanText);
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Perfecto, reiniciamos. Cuéntame qué necesitas ahora y armamos algo mejor.',
        timestamp: new Date(),
      },
    ]);
    loadSuggestions();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? theme.background : '#f4f6fb' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={[styles.header, { backgroundColor: isDark ? theme.surface : '#ffffff', borderBottomColor: theme.borderSoft }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerIdentity}>
            <FitBotLogo size={58} />
            <View style={styles.headerCopy}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>FitBot</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>{quickStatus}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.clearButton, { backgroundColor: theme.primary }]} onPress={clearChat} activeOpacity={0.86}>
            <Ionicons name="refresh-outline" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerBadgeRow}>
          <View style={[styles.liveBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>En linea</Text>
          </View>
          <Text style={[styles.headerHint, { color: theme.textSoft }]}>Respuestas con contexto de tu perfil</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          return (
            <AnimatedMessage key={`${message.role}-${index}-${message.timestamp}`} isUser={isUser}>
              <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
                {!isUser ? (
                  <View style={styles.botChip}>
                    <FitBotLogo size={34} compact />
                  </View>
                ) : null}

                <View
                  style={[
                    styles.messageBubble,
                    isUser ? [styles.userBubble, { backgroundColor: theme.primary }] : [styles.botBubble, { backgroundColor: isDark ? theme.surfaceAlt : theme.surface, borderColor: theme.border }],
                    message.isError && styles.errorBubble,
                  ]}
                >
                  {!isUser ? <Text style={styles.speakerLabel}>FitBot</Text> : null}
                  <Text style={[styles.messageText, isUser ? styles.userText : [styles.botText, { color: theme.text }]]}>
                    {message.content}
                  </Text>
                  <Text style={[styles.messageTime, isUser ? styles.userTime : [styles.botTime, { color: theme.textSoft }]]}>
                    {formatTime(message.timestamp)}
                  </Text>
                </View>

                {isUser ? (
                  <View style={[styles.userAvatar, { backgroundColor: theme.primarySoft }]}>
                    <Text style={styles.userAvatarText}>{firstName.charAt(0).toUpperCase()}</Text>
                  </View>
                ) : null}
              </View>
            </AnimatedMessage>
          );
        })}

        {loading ? (
          <View style={styles.messageRow}>
            <View style={styles.botChip}>
              <FitBotLogo size={34} compact />
            </View>
            <View style={[styles.typingBubble, { backgroundColor: isDark ? theme.surfaceAlt : theme.surface, borderColor: theme.border }]}>
              <Text style={styles.speakerLabel}>FitBot</Text>
              <TypingDots />
              <Text style={[styles.typingText, { color: theme.textMuted }]}>Preparando una respuesta util para ti</Text>
            </View>
          </View>
        ) : null}

        {messages.length <= 2 && suggestions.length > 0 ? (
          <View style={[styles.starterPanel, { backgroundColor: isDark ? theme.surface : theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.starterTitle, { color: theme.text }]}>Prueba con alguna de estas ideas</Text>
            {suggestions.slice(0, 4).map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion}-${index}`}
                style={[styles.starterButton, { backgroundColor: isDark ? '#1a1a20' : theme.surfaceAlt, borderColor: theme.border }]}
                onPress={() => handleSuggestionPress(suggestion)}
                activeOpacity={0.9}
              >
                <Ionicons name="sparkles-outline" size={16} color="#ffb6cf" />
                <Text style={[styles.starterText, { color: theme.text }]}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.composerSection, { backgroundColor: isDark ? '#0f1013' : theme.surface, borderTopColor: theme.borderSoft }]}>
        {suggestions.length > 0 && messages.length > 2 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickSuggestionsRow}
          >
            {suggestions.slice(0, 4).map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion}-${index}`}
                style={[styles.quickChip, { backgroundColor: isDark ? '#18181b' : theme.surfaceAlt, borderColor: theme.border }]}
                onPress={() => handleSuggestionPress(suggestion)}
                activeOpacity={0.88}
              >
                <Text style={[styles.quickChipText, { color: isDark ? '#fda4af' : theme.primary }]} numberOfLines={1}>
                  {sanitizeSuggestionText(suggestion)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.inputShell, { backgroundColor: isDark ? '#17181c' : theme.surfaceAlt, borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Preguntale a FitBot por tu dieta, rutina o progreso..."
            placeholderTextColor={theme.textSoft}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Ionicons name="arrow-up" size={22} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: '#111114',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 14,
  },
  headerCopy: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 4,
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '600',
  },
  clearButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#e60404',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  liveText: {
    color: '#f9fafb',
    fontSize: 12,
    fontWeight: '800',
  },
  headerHint: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  logoShell: {
    backgroundColor: '#e60404',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  logoAntenna: {
    position: 'absolute',
    width: 3,
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },
  logoDot: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
  logoHead: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginTop: 2,
  },
  logoEye: {
    backgroundColor: '#e60404',
  },
  logoBodyRow: {
    position: 'absolute',
    bottom: 6,
    width: '82%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoArm: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botChip: {
    marginRight: 10,
    marginBottom: 4,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 10,
    marginBottom: 4,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#e60404',
    fontSize: 13,
    fontWeight: '900',
  },
  messageBubble: {
    maxWidth: '79%',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  userBubble: {
    backgroundColor: '#e60404',
    borderBottomRightRadius: 8,
    shadowColor: '#e60404',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  botBubble: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#27272a',
    borderBottomLeftRadius: 8,
  },
  errorBubble: {
    borderColor: '#7f1d1d',
    backgroundColor: '#2b1215',
  },
  speakerLabel: {
    color: '#fda4af',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  userText: {
    color: '#ffffff',
  },
  botText: {
    color: '#f3f4f6',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 8,
    fontWeight: '700',
  },
  userTime: {
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'right',
  },
  botTime: {
    color: '#9ca3af',
  },
  typingBubble: {
    maxWidth: '72%',
    borderRadius: 22,
    borderBottomLeftRadius: 8,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffb6cf',
    marginRight: 6,
  },
  typingText: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '600',
  },
  starterPanel: {
    backgroundColor: '#111114',
    borderWidth: 1,
    borderColor: '#22252d',
    borderRadius: 24,
    padding: 16,
    marginTop: 8,
  },
  starterTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  starterButton: {
    backgroundColor: '#1a1a20',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#312e35',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  starterText: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginLeft: 10,
    flex: 1,
  },
  composerSection: {
    backgroundColor: '#0f1013',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  quickSuggestionsRow: {
    paddingBottom: 10,
  },
  quickChip: {
    borderRadius: 999,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    maxWidth: 210,
  },
  quickChipText: {
    color: '#fda4af',
    fontSize: 12,
    fontWeight: '700',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#17181c',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#282b33',
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 21,
    maxHeight: 110,
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: 10,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#e60404',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e60404',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#4b5563',
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default ChatbotScreen;
