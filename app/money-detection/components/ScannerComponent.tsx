import React, { useEffect, useState } from "react";
import { WebView } from "react-native-webview";
import {
  StyleSheet,
  Text,
} from "react-native";
import { Camera } from "expo-camera";

export const ScannerComponent = (props: any) => {
  const [hasPermission, setHasPermission] = useState(false);
  const getURI = () => {
    let URI =
      "https://tony-xlh.github.io/Vanilla-JS-Document-Scanner-Demos/react-native/?autoStart=true&colorMode=2&license=DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzNTI0Mjg3LVRYbFhaV0pRY205cSIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21kbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsIm9yZ2FuaXphdGlvbklEIjoiMTAzNTI0Mjg3Iiwic3RhbmRieVNlcnZlclVSTCI6Imh0dHBzOi8vc2Rscy5keW5hbXNvZnRvbmxpbmUuY29tIiwiY2hlY2tDb2RlIjo0NDA2MDAxNDB9";
    return URI;
  };
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);
  if (hasPermission) {
    return (
      <WebView
        style={styles.webview}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onMessage={(event) => {
          if (!event.nativeEvent.data) {
            if (props.onClosed) {
              props.onClosed();
            }
          } else {
            if (props.onScanned) {
              const dataURL = event.nativeEvent.data;
              props.onScanned(dataURL);
            }
          }
        }}
        source={{ uri: getURI() }}
      />
    );
  } else {
    return <Text>No permission.</Text>;
  }
};

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
});
