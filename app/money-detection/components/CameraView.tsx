import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { CameraCapturedPicture, CameraView as ExpoCamera } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useEffect, useRef, useState } from "react";
import * as FileSystem from "expo-file-system";
import { isScanConfig } from "../assets/config";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
} from "react-native";
import { ScannerComponent } from "./ScannerComponent";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface CameraViewProps {
  cameraRef: React.RefObject<ExpoCamera>;
  facing: "front" | "back";
  onCapture: (photoGraph: CameraCapturedPicture) => void;
}

export const CameraViewComponent = ({
  cameraRef,
  facing,
  onCapture,
}: CameraViewProps) => {
  const guideBoxRef = useRef<View>(null);
  const [guideBoxDimensions, setGuideBoxDimensions] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [loading, setLoading] = useState(true);

  // Hàm lấy kích thước và vị trí của GuideBox
  useEffect(() => {
    if (guideBoxRef.current) {
      guideBoxRef.current.measureInWindow((x, y, width, height) => {
        setGuideBoxDimensions({ x, y, width, height });
      });
    }
  }, []);

  const fakeDataLoading = () => {
    setTimeout(() => {
      setLoading(false);
    }, 3000); // Simulate loading for 3 seconds
  };

  useEffect(() => {
    fakeDataLoading();
  }, []);

  const handleCapture = async () => {
    console.log("handleScan");
    if (!cameraRef.current) return;

    try {
      // Chụp ảnh với độ phân giải đầy đủ
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
      });

      if (photo) {
        console.log("photo", photo);
        // Tính toán tỷ lệ giữa ảnh gốc và kích thước màn hình
        const scaleFactorWidth = photo.width / screenWidth;
        const scaleFactorHeight = photo.height / screenHeight;

        // Tính toán vị trí và kích thước mới của vùng cắt
        const cropRegion = {
          originX: Math.floor(guideBoxDimensions.x * scaleFactorWidth),
          originY: Math.floor(guideBoxDimensions.y * scaleFactorHeight),
          width: Math.floor(guideBoxDimensions.width * scaleFactorWidth),
          height: Math.floor(guideBoxDimensions.height * scaleFactorHeight),
        };

        // Kiểm tra và điều chỉnh vùng cắt để đảm bảo nằm trong giới hạn ảnh
        const adjustedCropRegion = {
          originX: Math.max(0, Math.min(cropRegion.originX, photo.width - 1)),
          originY: Math.max(0, Math.min(cropRegion.originY, photo.height - 1)),
          width: Math.min(cropRegion.width, photo.width - cropRegion.originX),
          height: Math.min(
            cropRegion.height,
            photo.height - cropRegion.originY
          ),
        };

        // Phần còn lại của code giữ nguyên
        const croppedImage = await ImageManipulator.manipulateAsync(
          photo.uri,
          [
            {
              crop: adjustedCropRegion,
            },
          ],
          {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        console.log("croppedImage", croppedImage);

        // const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        // if (status !== 'granted') {
        //   alert('Cần quyền truy cập thư viện ảnh để thực hiện chức năng này!');
        //   return;
        // }
        // const asset = await MediaLibrary.createAssetAsync(croppedImage.uri);
        onCapture(croppedImage);
      }
    } catch (error) {
      console.error("Error capturing or cropping image:", error);
    }
  };

  const handleScan = async () => {
    console.log("handleScan");
    setShowScanner(true);
  };

  const removeDataURLHead = (dataURL: string) => {
    return dataURL.substring(dataURL.indexOf(",") + 1, dataURL.length);
  };

  const onScanned = async (dataURL: string) => {
    console.log("onScanned");
    const timestamp = new Date().getTime();
    const path = FileSystem.documentDirectory + timestamp + ".png";
    const base64Code = removeDataURLHead(dataURL);
    await FileSystem.writeAsStringAsync(path, base64Code, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // setImage({ uri: path });

    const croppedImage = await ImageManipulator.manipulateAsync(path);
    console.log("path", croppedImage);
    onCapture(croppedImage);

    setShowScanner(false);
  };
  let resultView = <></>;
  if (isScanConfig) {
    resultView = (
      <>
        <ScannerComponent
          onScanned={(dataURL: string) => onScanned(dataURL)}
        ></ScannerComponent>

        <Modal animationType="none" transparent={true} visible={loading}>
          <View style={styles.centeredView}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text>Loading...</Text>
          </View>
        </Modal>
      </>
    );
  } else {
    resultView = (
      <ExpoCamera style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.overlay}>
          <View style={styles.contentArea}>
            <View style={styles.guideBoxContainer}>
              <GuideBox guideBoxRef={guideBoxRef} />
            </View>
          </View>
          <BlurView intensity={50} tint="dark" style={styles.controlsContainer}>
            <ControlButtons onCapture={handleCapture} label={"Chụp ảnh"} />
          </BlurView>

          <BlurView intensity={50} tint="dark" style={styles.controlsContainer}>
            <ControlButtons onCapture={handleScan} label={"Scan"} />
          </BlurView>
        </View>
      </ExpoCamera>
    );
  }

  return <View style={styles.container}>{resultView}</View>;
};

// Các component phụ và styles giữ nguyên như cũ...
// @ts-ignore
const GuideBox = ({ guideBoxRef }) => (
  <View ref={guideBoxRef} style={styles.guideLines}>
    <View style={[styles.corner, styles.cornerTL]} />
    <View style={[styles.corner, styles.cornerTR]} />
    <View style={[styles.corner, styles.cornerBL]} />
    <View style={[styles.corner, styles.cornerBR]} />
  </View>
);

const ControlButtons = ({
  onCapture,
  label,
}: {
  onCapture: () => void;
  label: String;
}) => (
  <View style={styles.buttonGroup}>
    <TouchableOpacity
      style={[styles.button, styles.captureButton]}
      onPress={onCapture}
    >
      <Ionicons name="camera" size={48} color="white" />
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  // Styles giữ nguyên như cũ...
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgb(255, 255, 255)",
  },
  modalView: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    elevation: 5,
  },
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    zIndex: 2,
  },
  headerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  contentArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  guideBoxContainer: {
    width: screenWidth,
    height: "90%",
    justifyContent: "center",
    alignItems: "center",
  },

  guideLines: {
    width: "60%",
    height: "100%",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "#2196F3",
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  guideTextContainer: {
    position: "absolute",
    bottom: "2%",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  guideText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  controlsContainer: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    zIndex: 2,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 48,
    borderRadius: 25,
    minWidth: 120,
    justifyContent: "center",
    // paddingTop: 100,
    width: "100%",
  },
  galleryButton: {
    backgroundColor: "rgba(76, 175, 80, 0.9)",
  },
  captureButton: {
    backgroundColor: "#2196F3",
  },
  buttonText: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "600",
    marginLeft: 12,
  },
});
