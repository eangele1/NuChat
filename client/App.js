import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  Button,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { io } from "socket.io-client";

export default function App() {
  const ref = useRef();
  const [message, setMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [usersActive, setUsersActive] = useState(0);
  const [isConnected, setConnected] = useState(false);
  const [isSearching, setSearching] = useState(false);
  const [eventMsg, setEventMsg] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    const socket = io("http://192.168.1.222:3000");
    socket.on("message", (msg) => {
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
        <Text>NuChat</Text>
        <Text>Users Online: {usersActive}</Text>
        <View style={{ flexDirection: "row", justifyContent: "center" }}>
          <Button title="Start Chat" onPress={newConvo} />
        </View>
      </View>
    );
  };

  const chatMessages = messageList.map((item, index) => (
    <Text
      style={{ textAlign: item.user === "You" ? "right" : "left" }}
      key={index}
    >
      {item.message}
    </Text>
  ));

  if (chatOpen) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          {chatMessages}
          {eventMsg !== "" && (
            <Text style={{ textAlign: "center" }}>{eventMsg}</Text>
          )}
          <View style={{ flexDirection: "row" }}>
            <View>
              <Button
                title={isConnected || isSearching ? "Stop" : "New"}
                onPress={isConnected || isSearching ? detatchConvo : newConvo}
              />
            </View>
            <TextInput
              style={{ height: 40, width: 300, padding: 10, borderWidth: 2 }}
              autoCorrect={false}
              onChangeText={setMessage}
              onSubmitEditing={handleMessage}
              onFocus={() => isTyping(true)}
              onBlur={() => isTyping(false)}
              value={message}
              editable={isConnected}
              selectTextOnFocus={isConnected}
            />
            <View>
              <Button title="Clear" onPress={clearChat} />
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
    backgroundColor: "#fff",
    justifyContent: "flex-end",
  },
  home: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
