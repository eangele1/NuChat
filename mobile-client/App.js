import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
  Image,
  TouchableOpacity,
} from "react-native";
import { io } from "socket.io-client";
import { StatusBar } from "expo-status-bar";
import { DOMAIN_NAME } from "@env";

export default function App() {
  const ref = useRef();
  const scrollViewRef = useRef();
  const [message, setMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [usersActive, setUsersActive] = useState(0);
  const [isConnected, setConnected] = useState(false);
  const [isSearching, setSearching] = useState(false);
  const [eventMsg, setEventMsg] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    const socket = io(`http://${DOMAIN_NAME}:3000`);
    socket.on("message", (msg) => {
      scrollViewRef.current.scrollToEnd({ animated: true });
      setMessageList((prev) => prev.concat(msg));
    });

    socket.on("stats", (stats) => {
      setUsersActive(stats.people);
    });

    socket.on("newConvo", (msg) => {
      setConnected(true);
      setEventMsg(msg);
      setSearching(false);

      timerRef.current = setTimeout(() => {
        setEventMsg("");
      }, 5000);
    });

    socket.on("detatchConvo", (msg) => {
      setConnected(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      scrollViewRef.current.scrollToEnd({ animated: true });
      setEventMsg(msg);
    });

    socket.on("typing", (result) => {
      setEventMsg(result ? "Stranger is typing..." : "");
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    });

    ref.current = socket;

    return () => socket.disconnect();
  }, []);

  const newConvo = () => {
    if (!chatOpen) {
      setChatOpen(true);
    }

    ref.current.emit("newConvo");
    setMessageList([]);
    setEventMsg("Waiting for next person...");
    setSearching(true);
  };

  const isTyping = (choice) => {
    ref.current.emit("typing", choice);
  };

  const detatchConvo = () => {
    ref.current.emit("detatchConvo");
    setSearching(false);
  };

  const handleMessage = () => {
    if (message === "") {
      return;
    }
    ref.current.emit("message", message);
    setMessage("");
  };

  const clearChat = () => {
    setMessageList([]);
  };

  const HomeScreen = () => {
    return (
      <View style={styles.home}>
        <StatusBar style="light" />
        <Image
          source={require("./assets/logo.png")}
          resizeMode="contain"
          style={{ width: 300, height: 50 }}
        />
        <Text style={{ color: "white", marginTop: 20, marginBottom: 20 }}>
          Users Online: {usersActive}
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "center" }}>
          <Pressable
            onPress={newConvo}
            style={[styles.eventButton, { flex: 0 }]}
          >
            <Text>Start Chat</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const chatMessages = messageList.map((item, index) => (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: item.user === "You" ? "flex-end" : "flex-start",
      }}
      key={index}
    >
      <View
        style={{
          backgroundColor: item.user === "You" ? "#8DD7F7" : "#D6D6D6",
          margin: 10,
          padding: 7.5,
          borderRadius: 10,
        }}
      >
        <Text>{item.message}</Text>
      </View>
    </View>
  ));

  if (chatOpen) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <StatusBar style="light" />
          <View style={{ height: 30 }} />
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <View>
              <ScrollView ref={scrollViewRef}>
                <TouchableOpacity activeOpacity={1}>
                  {chatMessages}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
          {eventMsg !== "" && (
            <Text
              style={{
                textAlign: "center",
                marginTop: 15,
                marginBottom: 5,
                color: "white",
              }}
            >
              {eventMsg}
            </Text>
          )}
          <View
            style={{ marginTop: 10, flexDirection: "row", marginBottom: 10 }}
          >
            <View>
              <Pressable
                onPress={isConnected || isSearching ? detatchConvo : newConvo}
                style={styles.eventButton}
              >
                <Text>{isConnected || isSearching ? "Stop" : "New"}</Text>
              </Pressable>
            </View>
            <View
              style={{
                flex: 1,
                justifyContent: "center",
              }}
            >
              <TextInput
                style={{
                  height: 40,
                  padding: 10,
                  borderWidth: 2,
                  backgroundColor: "white",
                }}
                autoCorrect={false}
                onChangeText={setMessage}
                onSubmitEditing={handleMessage}
                onFocus={() => {
                  scrollViewRef.current.scrollToEnd({ animated: true });
                  isTyping(true);
                }}
                onBlur={() => {
                  scrollViewRef.current.scrollToEnd({ animated: true });
                  isTyping(false);
                }}
                value={message}
                editable={isConnected}
                selectTextOnFocus={isConnected}
              />
            </View>

            <View>
              <Pressable onPress={clearChat} style={styles.eventButton}>
                <Text style={{}}>Clear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  } else {
    return <HomeScreen />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#202F4F",
    justifyContent: "flex-end",
  },
  home: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#202F4F",
  },
  eventButton: {
    flex: 1,
    padding: 10,
    marginLeft: 5,
    marginRight: 5,
    backgroundColor: "#FFD23F",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 2,
  },
});
