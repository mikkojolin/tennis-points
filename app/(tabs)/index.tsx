import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// FIREBASE INITIALIZATION
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AiZaSyDU6tKXBeauz7VOVvdq_8-s2tsGu9VWveM",
  authDomain: "tennis-points-2014a.firebaseapp.com",
  databaseURL:
    "https://tennis-points-2014a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tennis-points-2014a",
  storageBucket: "tennis-points-2014a.firebasestorage.app",
  messagingSenderId: "751703571864",
  appId: "1:751703571864:web:938d65941c6bf0b919ffed",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Assets
const tennisBallGraphic = require("../../assets/images/tennis_ball_graphic.png");
const courtBackground = require("../../assets/images/court_background.png");
const volleyBallGraphic = require("../../assets/images/volleyball.png");
const beachBackground = require("../../assets/images/beach.png");

// Type Definitions
type MatchState = {
  p1Points: number;
  p2Points: number;
  p1Games: number;
  p2Games: number;
  p1Sets: number;
  p2Sets: number;
  completedSets: { p1: number; p2: number }[];
};

type MatchRecord = {
  id: string;
  date: string;
  p1Name: string;
  p2Name: string;
  winner: 1 | 2;
  sport: string;
  format: string;
  thirdSetRule: string;
  score: { p1: number; p2: number }[];
  duration?: number;
};

const STORAGE_KEY = "@sports_match_database";

// UI COMPONENTS
const SportDial = ({
  title,
  subTitle,
  isSelected,
  onPress,
  icon,
  darkText,
  size = 75,
  textBelow = false,
}: any) => {
  const radius = size / 2;
  return (
    <View style={{ alignItems: "center" }}>
      <TouchableOpacity
        style={[
          styles.ballWrapper,
          { width: size, height: size, borderRadius: radius },
          isSelected
            ? styles.ballWrapperSelected
            : darkText
              ? styles.ballWrapperUnselectedDark
              : styles.ballWrapperUnselected,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {isSelected && (
          <View style={[styles.imageMask, { borderRadius: radius }]}>
            <Image
              source={icon}
              style={styles.ballGraphicSelected}
              resizeMode="cover"
            />
          </View>
        )}
        {!textBelow && (
          <View style={styles.ballContent}>
            <Text
              style={[
                styles.ballText,
                { fontSize: size > 75 ? 20 : 16 },
                isSelected
                  ? styles.textActive
                  : darkText
                    ? styles.textActive
                    : styles.textInactive,
              ]}
            >
              {title}
            </Text>
            {subTitle && (
              <Text
                style={[
                  styles.ballSubText,
                  { fontSize: size > 75 ? 16 : 12 },
                  isSelected
                    ? styles.textActive
                    : darkText
                      ? styles.textActive
                      : styles.textInactive,
                ]}
              >
                {subTitle}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
      {textBelow && (
        <View style={{ marginTop: 10, alignItems: "center" }}>
          <Text
            style={[
              styles.ballText,
              { fontSize: 20, fontWeight: "900" },
              darkText
                ? {
                    color: "#000",
                    textShadowColor: "rgba(255,255,255,0.8)",
                    textShadowRadius: 4,
                  }
                : styles.textInactive,
            ]}
          >
            {title}
          </Text>
          {subTitle && (
            <Text
              style={[
                styles.ballSubText,
                { fontSize: 16, fontWeight: "800", marginTop: 2 },
                darkText
                  ? {
                      color: "#000",
                      textShadowColor: "rgba(255,255,255,0.8)",
                      textShadowRadius: 4,
                    }
                  : styles.textInactive,
              ]}
            >
              {subTitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<
    | "sportSelect"
    | "setup"
    | "volleySetup"
    | "match"
    | "volleyMatch"
    | "history"
    | "victory"
  >("sportSelect");

  const [selectedSport, setSelectedSport] = useState<"tennis" | "volleyball">(
    "tennis",
  );

  // Shared Setup State
  const [p1Name, setP1Name] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [p1Points, setP1Points] = useState(0);
  const [p2Points, setP2Points] = useState(0);
  const [p1Sets, setP1Sets] = useState(0);
  const [p2Sets, setP2Sets] = useState(0);
  const [completedSets, setCompletedSets] = useState<
    { p1: number; p2: number }[]
  >([]);
  const [matchWinner, setMatchWinner] = useState<1 | 2 | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [history, setHistory] = useState<MatchState[]>([]);
  const [matchDatabase, setMatchDatabase] = useState<MatchRecord[]>([]);

  // Timer State
  const [matchStartTime, setMatchStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Tennis Specific State
  const [format, setFormat] = useState("classic");
  const [thirdSet, setThirdSet] = useState("tiebreak");
  const [matchTbLength, setMatchTbLength] = useState(10);
  const [setTbLength, setSetTbLength] = useState(7);
  const [noAdRule, setNoAdRule] = useState(false);
  const [p1Games, setP1Games] = useState(0);
  const [p2Games, setP2Games] = useState(0);

  // Beach Volley Specific State
  const [volleySetsToWin, setVolleySetsToWin] = useState(2);
  const [volleyPointsPerSet, setVolleyPointsPerSet] = useState(21);
  const [sideChangeInterval, setSideChangeInterval] = useState(7); // 0 means Never

  // LOGIC HELPERS
  const isMatchTiebreak = p1Sets + p2Sets === 2 && thirdSet === "tiebreak";
  const isSetTiebreak =
    (format === "classic" && p1Games === 6 && p2Games === 6) ||
    (format === "fast4" && p1Games === 3 && p2Games === 3);
  const isTiebreak = isMatchTiebreak || isSetTiebreak;
  const targetTiebreakPoints = isMatchTiebreak ? matchTbLength : setTbLength;

  const getTennisScore = (p: number) => {
    const s = ["0", "15", "30", "40", "Ad"];
    return s[p] || "0";
  };

  const totalVolleyPoints = p1Points + p2Points;
  const showSideChangeReminder =
    selectedSport === "volleyball" &&
    sideChangeInterval > 0 &&
    totalVolleyPoints > 0 &&
    totalVolleyPoints % sideChangeInterval === 0;

  const currentBackground =
    selectedSport === "volleyball" ? beachBackground : courtBackground;

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    const h = Math.floor(totalSeconds / 3600);
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  // SIDE EFFECTS
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) setMatchDatabase(JSON.parse(jsonValue));
      } catch (err) {
        console.error("Database load error", err);
      }
    };
    loadDatabase();
  }, []);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (
      (currentScreen === "match" || currentScreen === "volleyMatch") &&
      matchStartTime
    ) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - matchStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentScreen, matchStartTime]);

  useEffect(() => {
    if (matchId) {
      const matchRef = ref(db, "live_matches/" + matchId);
      set(matchRef, {
        sport: selectedSport === "tennis" ? "Tennis" : "Beach Volley",
        p1Name: p1Name || "Player 1",
        p2Name: p2Name || "Player 2",
        p1Points:
          selectedSport === "tennis"
            ? isTiebreak
              ? p1Points
              : getTennisScore(p1Points)
            : p1Points,
        p2Points:
          selectedSport === "tennis"
            ? isTiebreak
              ? p2Points
              : getTennisScore(p2Points)
            : p2Points,
        p1Games,
        p2Games,
        p1Sets,
        p2Sets,
        completedSets,
        isTiebreak,
        lastUpdated: Date.now(),
      }).catch((err) => console.log("Firebase Error:", err));
    }
  }, [
    p1Points,
    p2Points,
    p1Games,
    p2Games,
    p1Sets,
    p2Sets,
    completedSets,
    isTiebreak,
    p1Name,
    p2Name,
    matchId,
    selectedSport,
  ]);

  // ENGINE FUNCTIONS
  const saveDatabase = async (newDatabase: MatchRecord[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newDatabase));
    } catch (err) {
      console.error("Save error", err);
    }
  };

  const handleLiveShare = async () => {
    const newId = `LOHJA-${Math.floor(1000 + Math.random() * 9000)}`;
    setMatchId(newId);
    const shareUrl = `https://mikkojolin.github.io/tennis-points/?match=${newId}`;
    try {
      await Share.share({
        message: `🎾 Live Match!\n${p1Name || "P1"} vs ${p2Name || "P2"}\nLink: ${shareUrl}`,
      });
    } catch {
      console.log("Share failed");
    }
  };

  const handleTennisScore = (scorer: 1 | 2) => {
    setHistory([
      ...history,
      {
        p1Points,
        p2Points,
        p1Games,
        p2Games,
        p1Sets,
        p2Sets,
        completedSets: [...completedSets],
      },
    ]);
    let p1 = p1Points;
    let p2 = p2Points;
    scorer === 1 ? p1++ : p2++;
    let gameWonBy = 0;

    if (isTiebreak) {
      if (p1 >= targetTiebreakPoints && p1 - p2 >= 2) gameWonBy = 1;
      else if (p2 >= targetTiebreakPoints && p2 - p1 >= 2) gameWonBy = 2;
    } else {
      if (p1 >= 4 && p1 - p2 >= 2) gameWonBy = 1;
      else if (p2 >= 4 && p2 - p1 >= 2) gameWonBy = 2;
      else if (noAdRule && p1 === 4 && p2 === 3) gameWonBy = 1;
      else if (noAdRule && p2 === 4 && p1 === 3) gameWonBy = 2;
      else if (!noAdRule && p1 === 4 && p2 === 4) {
        p1 = 3;
        p2 = 3;
      }
    }

    if (gameWonBy > 0) {
      setP1Points(0);
      setP2Points(0);
      let nP1G = p1Games;
      let nP2G = p2Games;
      gameWonBy === 1 ? nP1G++ : nP2G++;
      let setWonBy = 0;

      if (isMatchTiebreak || isSetTiebreak) setWonBy = gameWonBy;
      else if (format === "classic") {
        if (nP1G >= 6 && nP1G - nP2G >= 2) setWonBy = 1;
        else if (nP2G >= 6 && nP2G - nP1G >= 2) setWonBy = 2;
      } else {
        if (nP1G === 4) setWonBy = 1;
        else if (nP2G === 4) setWonBy = 2;
      }

      if (setWonBy > 0) {
        if (
          (setWonBy === 1 && p1Sets + 1 === 2) ||
          (setWonBy === 2 && p2Sets + 1 === 2)
        ) {
          recordMatchResult(setWonBy as 1 | 2, nP1G, nP2G);
        } else {
          setCompletedSets([...completedSets, { p1: nP1G, p2: nP2G }]);
          setP1Games(0);
          setP2Games(0);
          setWonBy === 1 ? setP1Sets(p1Sets + 1) : setP2Sets(p2Sets + 1);
        }
      } else {
        setP1Games(nP1G);
        setP2Games(nP2G);
      }
    } else {
      setP1Points(p1);
      setP2Points(p2);
    }
  };

  const handleVolleyScore = (scorer: 1 | 2) => {
    setHistory([
      ...history,
      {
        p1Points,
        p2Points,
        p1Games: 0,
        p2Games: 0,
        p1Sets,
        p2Sets,
        completedSets: [...completedSets],
      },
    ]);
    let p1 = p1Points;
    let p2 = p2Points;
    scorer === 1 ? p1++ : p2++;

    let currentSetTarget = volleyPointsPerSet;
    const isDecidingSet =
      p1Sets + p2Sets === volleySetsToWin * 2 - 2 && volleySetsToWin > 1;

    if (isDecidingSet && currentSetTarget > 15) {
      currentSetTarget = 15;
    }

    if (p1 >= currentSetTarget && p1 - p2 >= 2) {
      if (p1Sets + 1 === volleySetsToWin) recordMatchResult(1, p1, p2);
      else {
        setCompletedSets([...completedSets, { p1, p2 }]);
        setP1Points(0);
        setP2Points(0);
        setP1Sets(p1Sets + 1);
      }
    } else if (p2 >= currentSetTarget && p2 - p1 >= 2) {
      if (p2Sets + 1 === volleySetsToWin) recordMatchResult(2, p1, p2);
      else {
        setCompletedSets([...completedSets, { p1, p2 }]);
        setP1Points(0);
        setP2Points(0);
        setP2Sets(p2Sets + 1);
      }
    } else {
      setP1Points(p1);
      setP2Points(p2);
    }
  };

  const recordMatchResult = (
    winner: 1 | 2,
    finalSetP1: number,
    finalSetP2: number,
  ) => {
    const finalDuration = matchStartTime
      ? Math.floor((Date.now() - matchStartTime) / 1000)
      : elapsedSeconds;
    const finalScoreArray = [
      ...completedSets,
      { p1: finalSetP1, p2: finalSetP2 },
    ];

    const newRecord: MatchRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      p1Name: p1Name || "Player 1",
      p2Name: p2Name || "Player 2",
      winner,
      sport: selectedSport === "tennis" ? "Tennis" : "Beach Volley",
      format:
        selectedSport === "tennis"
          ? format
          : `Best of ${volleySetsToWin === 1 ? 1 : volleySetsToWin === 2 ? 3 : 5}`,
      thirdSetRule:
        selectedSport === "tennis"
          ? thirdSet === "full"
            ? "Full Set"
            : `TB to ${matchTbLength}`
          : `Target: ${volleyPointsPerSet}`,
      score: finalScoreArray,
      duration: finalDuration,
    };

    const updatedDB = [newRecord, ...matchDatabase];
    setMatchDatabase(updatedDB);
    saveDatabase(updatedDB);
    setCompletedSets(finalScoreArray);
    setMatchWinner(winner);
    setCurrentScreen("victory");
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const newHistory = [...history];
    const prev = newHistory.pop();
    if (prev) {
      setP1Points(prev.p1Points);
      setP2Points(prev.p2Points);
      setP1Games(prev.p1Games);
      setP2Games(prev.p2Games);
      setP1Sets(prev.p1Sets);
      setP2Sets(prev.p2Sets);
      setCompletedSets(prev.completedSets);
      setHistory(newHistory);
    }
  };

  const resetFullMatch = () => {
    setP1Points(0);
    setP2Points(0);
    setP1Games(0);
    setP2Games(0);
    setP1Sets(0);
    setP2Sets(0);
    setCompletedSets([]);
    setHistory([]);
    setMatchWinner(null);
    setMatchId(null);
    setMatchStartTime(null);
    setElapsedSeconds(0);
  };

  // SCREENS
  if (currentScreen === "sportSelect") {
    return (
      <ImageBackground
        source={currentBackground}
        style={styles.container}
        blurRadius={15}
      >
        <View style={styles.overlayDark}>
          <View style={styles.headerAreaTextLogo}>
            <Text style={styles.mainTitleText}>MatchPoint</Text>
            <Text style={styles.setupSubtitleText}>Courtside companion</Text>
          </View>
          <Text style={styles.mainSelectLabel}>Select Sport</Text>
          <View style={styles.ballOptionContainer}>
            <SportDial
              title="Tennis"
              isSelected={selectedSport === "tennis"}
              icon={tennisBallGraphic}
              onPress={() => setSelectedSport("tennis")}
              size={100}
            />
            <SportDial
              title={"Beach\nVolley"}
              isSelected={selectedSport === "volleyball"}
              icon={volleyBallGraphic}
              onPress={() => setSelectedSport("volleyball")}
              size={100}
            />
          </View>
          <TouchableOpacity
            style={[styles.startMatchButton, { marginTop: 80 }]}
            onPress={() =>
              setCurrentScreen(
                selectedSport === "tennis" ? "setup" : "volleySetup",
              )
            }
          >
            <Text style={styles.startMatchButtonText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.historyButton, { marginTop: 20 }]}
            onPress={() => setCurrentScreen("history")}
          >
            <Text style={styles.historyButtonText}>📚 Match Database</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  if (currentScreen === "setup") {
    return (
      <ImageBackground
        source={courtBackground}
        style={styles.container}
        blurRadius={12}
      >
        <View style={styles.overlayDark}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{ paddingBottom: 60, paddingTop: 60 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.headerAreaTextLogo}>
                <Text style={styles.mainTitleText}>MatchPoint</Text>
                <Text style={styles.setupSubtitleText}>
                  Courtside companion
                </Text>
              </View>
              <View style={styles.glassCard}>
                <Text style={styles.Label}>Player Names</Text>
                <TextInput
                  style={styles.glassInput}
                  placeholder="Player 1"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={p1Name}
                  onChangeText={setP1Name}
                />
                <TextInput
                  style={styles.glassInput}
                  placeholder="Player 2"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={p2Name}
                  onChangeText={setP2Name}
                />
              </View>
              <Text style={styles.Label}>Game Format</Text>
              <View style={styles.ballOptionContainer}>
                <SportDial
                  title="Classic"
                  subTitle="(to 6)"
                  isSelected={format === "classic"}
                  icon={tennisBallGraphic}
                  onPress={() => setFormat("classic")}
                />
                <SportDial
                  title="Fast4"
                  subTitle="(to 4)"
                  isSelected={format === "fast4"}
                  icon={tennisBallGraphic}
                  onPress={() => setFormat("fast4")}
                />
              </View>
              <Text style={styles.Label}>Deuce Rule</Text>
              <View style={styles.ballOptionContainer}>
                <SportDial
                  title="Ad"
                  subTitle="Std"
                  isSelected={!noAdRule}
                  icon={tennisBallGraphic}
                  onPress={() => setNoAdRule(false)}
                />
                <SportDial
                  title="No-Ad"
                  subTitle="Sudden"
                  isSelected={noAdRule}
                  icon={tennisBallGraphic}
                  onPress={() => setNoAdRule(true)}
                />
              </View>
              <Text style={styles.Label}>Set Tiebreak Length</Text>
              <View style={styles.ballOptionContainer}>
                <SportDial
                  title="5"
                  subTitle="Pts"
                  isSelected={setTbLength === 5}
                  icon={tennisBallGraphic}
                  onPress={() => setSetTbLength(5)}
                />
                <SportDial
                  title="7"
                  subTitle="Pts"
                  isSelected={setTbLength === 7}
                  icon={tennisBallGraphic}
                  onPress={() => setSetTbLength(7)}
                />
                <SportDial
                  title="10"
                  subTitle="Pts"
                  isSelected={setTbLength === 10}
                  icon={tennisBallGraphic}
                  onPress={() => setSetTbLength(10)}
                />
              </View>
              <Text style={styles.Label}>3rd Set Rules</Text>
              <View style={styles.ballOptionContainer}>
                <SportDial
                  title="Full"
                  subTitle="Set"
                  isSelected={thirdSet === "full"}
                  icon={tennisBallGraphic}
                  onPress={() => setThirdSet("full")}
                />
                <SportDial
                  title="Match"
                  subTitle="Tiebreak"
                  isSelected={thirdSet === "tiebreak"}
                  icon={tennisBallGraphic}
                  onPress={() => setThirdSet("tiebreak")}
                />
              </View>
              {thirdSet === "tiebreak" && (
                <>
                  <Text style={styles.Label}>Match Tiebreak Length</Text>
                  <View style={styles.ballOptionContainer}>
                    <SportDial
                      title="5"
                      subTitle="Pts"
                      isSelected={matchTbLength === 5}
                      icon={tennisBallGraphic}
                      onPress={() => setMatchTbLength(5)}
                    />
                    <SportDial
                      title="7"
                      subTitle="Pts"
                      isSelected={matchTbLength === 7}
                      icon={tennisBallGraphic}
                      onPress={() => setMatchTbLength(7)}
                    />
                    <SportDial
                      title="10"
                      subTitle="Pts"
                      isSelected={matchTbLength === 10}
                      icon={tennisBallGraphic}
                      onPress={() => setMatchTbLength(10)}
                    />
                  </View>
                </>
              )}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.startMatchButton}
                  onPress={() => {
                    setCurrentScreen("match");
                    setMatchStartTime(Date.now());
                  }}
                >
                  <Text style={styles.startMatchButtonText}>Start Match</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.historyButton}
                  onPress={() => setCurrentScreen("sportSelect")}
                >
                  <Text style={styles.historyButtonText}>← Back to Sports</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    );
  }

  if (currentScreen === "volleySetup") {
    return (
      <ImageBackground
        source={beachBackground}
        style={styles.container}
        blurRadius={12}
      >
        <View style={styles.beachOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{ paddingBottom: 60, paddingTop: 60 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.headerAreaTextLogo}>
                <Text style={styles.beachMainTitleText}>MatchPoint</Text>
                <Text style={styles.beachSetupSubtitleText}>
                  Courtside companion
                </Text>
              </View>
              <View style={styles.beachGlassCard}>
                <Text style={styles.beachLabel}>Team Names</Text>
                <TextInput
                  style={styles.beachInput}
                  placeholder="Team 1"
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  value={p1Name}
                  onChangeText={setP1Name}
                />
                <TextInput
                  style={styles.beachInput}
                  placeholder="Team 2"
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  value={p2Name}
                  onChangeText={setP2Name}
                />
              </View>

              <Text style={styles.beachLabel}>Best of Sets</Text>
              <View style={styles.beachBallOptionContainer}>
                <SportDial
                  title="1"
                  subTitle="Set"
                  isSelected={volleySetsToWin === 1}
                  icon={volleyBallGraphic}
                  onPress={() => setVolleySetsToWin(1)}
                  darkText
                  textBelow
                />
                <SportDial
                  title="3"
                  subTitle="Sets"
                  isSelected={volleySetsToWin === 2}
                  icon={volleyBallGraphic}
                  onPress={() => setVolleySetsToWin(2)}
                  darkText
                  textBelow
                />
                <SportDial
                  title="5"
                  subTitle="Sets"
                  isSelected={volleySetsToWin === 3}
                  icon={volleyBallGraphic}
                  onPress={() => setVolleySetsToWin(3)}
                  darkText
                  textBelow
                />
              </View>

              <Text style={styles.beachLabel}>Points per Set</Text>
              <View style={styles.beachBallOptionContainer}>
                <SportDial
                  title="15"
                  isSelected={volleyPointsPerSet === 15}
                  icon={volleyBallGraphic}
                  onPress={() => setVolleyPointsPerSet(15)}
                  darkText
                  textBelow
                />
                <SportDial
                  title="21"
                  isSelected={volleyPointsPerSet === 21}
                  icon={volleyBallGraphic}
                  onPress={() => setVolleyPointsPerSet(21)}
                  darkText
                  textBelow
                />
                <SportDial
                  title="25"
                  isSelected={volleyPointsPerSet === 25}
                  icon={volleyBallGraphic}
                  onPress={() => setVolleyPointsPerSet(25)}
                  darkText
                  textBelow
                />
              </View>

              <Text style={styles.beachLabel}>Change Sides Every</Text>
              <View style={styles.beachBallOptionContainer}>
                <SportDial
                  title="None"
                  isSelected={sideChangeInterval === 0}
                  icon={volleyBallGraphic}
                  onPress={() => setSideChangeInterval(0)}
                  darkText
                  textBelow
                />
                <SportDial
                  title="5"
                  subTitle="Pts"
                  isSelected={sideChangeInterval === 5}
                  icon={volleyBallGraphic}
                  onPress={() => setSideChangeInterval(5)}
                  darkText
                  textBelow
                />
                <SportDial
                  title="7"
                  subTitle="Pts"
                  isSelected={sideChangeInterval === 7}
                  icon={volleyBallGraphic}
                  onPress={() => setSideChangeInterval(7)}
                  darkText
                  textBelow
                />
              </View>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.startMatchButton,
                    {
                      backgroundColor: "#ffb347",
                      borderWidth: 2,
                      borderColor: "#000",
                    },
                  ]}
                  onPress={() => {
                    setCurrentScreen("volleyMatch");
                    setMatchStartTime(Date.now());
                  }}
                >
                  <Text
                    style={[
                      styles.startMatchButtonText,
                      { color: "#000", fontWeight: "900", fontSize: 24 },
                    ]}
                  >
                    Start Match
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.historyButton,
                    {
                      backgroundColor: "rgba(255,255,255,0.9)",
                      borderWidth: 2,
                      borderColor: "#000",
                    },
                  ]}
                  onPress={() => setCurrentScreen("sportSelect")}
                >
                  <Text
                    style={[
                      styles.historyButtonText,
                      { color: "#000", fontWeight: "800", fontSize: 20 },
                    ]}
                  >
                    ← Back to Sports
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    );
  }

  if (currentScreen === "history") {
    return (
      <ImageBackground
        source={currentBackground}
        style={styles.container}
        blurRadius={15}
      >
        <View style={styles.overlayDark}>
          <View style={{ paddingTop: 60, paddingBottom: 20, flex: 1 }}>
            <View style={styles.headerAreaTextLogo}>
              <Text style={styles.mainTitleText}>MatchPoint</Text>
              <Text style={styles.setupSubtitleText}>Courtside companion</Text>
            </View>
            {matchDatabase.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.Label}>No matches recorded.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {matchDatabase.map((m) => (
                  <View key={m.id} style={styles.dbCard}>
                    <View style={styles.dbHeader}>
                      <Text style={styles.dbDate}>
                        {m.date} - {m.sport}
                      </Text>
                      <Text style={styles.dbFormat}>
                        {m.format} | {m.thirdSetRule}
                        {m.duration ? ` | ⏱ ${formatTime(m.duration)}` : ""}
                      </Text>
                    </View>
                    <View style={styles.dbPlayersRow}>
                      <Text
                        style={[
                          styles.dbPlayerText,
                          m.winner === 1 && styles.dbWinnerText,
                        ]}
                      >
                        {m.winner === 1 ? "🏆 " : ""}
                        {m.p1Name}
                      </Text>
                      <Text style={styles.dbVsText}>vs</Text>
                      <Text
                        style={[
                          styles.dbPlayerText,
                          m.winner === 2 && styles.dbWinnerText,
                        ]}
                      >
                        {m.p2Name}
                        {m.winner === 2 ? " 🏆" : ""}
                      </Text>
                    </View>
                    <View style={styles.dbScoreContainer}>
                      {m.score.map((s, i) => (
                        <View key={i} style={styles.dbSetBox}>
                          <Text style={styles.dbSetScore}>
                            {s.p1} - {s.p2}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setMatchDatabase([]);
                    AsyncStorage.removeItem(STORAGE_KEY);
                  }}
                >
                  <Text style={styles.clearButtonText}>
                    🗑️ Clear All Matches
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentScreen("sportSelect")}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  if (currentScreen === "victory") {
    const winnerName =
      matchWinner === 1 ? p1Name || "Team 1" : p2Name || "Team 2";
    return (
      <ImageBackground
        source={currentBackground}
        style={styles.container}
        blurRadius={5}
      >
        <View
          style={[
            styles.overlayDark,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <View style={styles.headerAreaTextLogo}>
            <Text style={styles.mainTitleText}>MatchPoint</Text>
            <Text style={styles.setupSubtitleText}>Courtside companion</Text>
          </View>
          <Text style={styles.victorySubtitle}>Victory!</Text>
          <Text style={styles.victoryTitle}>{winnerName}</Text>
          <View style={styles.victoryScoreBox}>
            {completedSets.map((set, i) => (
              <View key={i} style={styles.victorySetCard}>
                <Text style={styles.victorySetText}>
                  {set.p1} - {set.p2}
                </Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.startMatchButton}
            onPress={() => {
              setCurrentScreen("sportSelect");
              resetFullMatch();
            }}
          >
            <Text style={styles.startMatchButtonText}>Return to Menu</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  if (currentScreen === "volleyMatch") {
    return (
      <ImageBackground
        source={beachBackground}
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.beachOverlay}>
          <View style={[styles.headerAreaTextLogo, { marginBottom: 20 }]}>
            <Text style={[styles.mainTitleText, { fontSize: 48 }]}>
              MatchPoint
            </Text>
            <Text style={styles.setupSubtitleText}>Courtside companion</Text>
          </View>
          <View style={styles.beachTimerBadge}>
            <Text style={styles.beachTimerText}>
              ⏱ {formatTime(elapsedSeconds)}
            </Text>
          </View>

          {matchId && (
            <View style={styles.liveIndicator}>
              <Text style={styles.liveIndicatorText}>
                ● LIVE BROADCAST: {matchId}
              </Text>
            </View>
          )}

          <View style={styles.beachGlassCard}>
            <View style={styles.beachScoreRowHeader}>
              <Text
                style={[styles.beachScoreCell, styles.beachNameCell]}
              ></Text>
              {completedSets.map((_, i) => (
                <Text key={i} style={styles.beachScoreCell}>
                  S{i + 1}
                </Text>
              ))}
              <Text style={[styles.beachScoreCell, { fontWeight: "900" }]}>
                S
              </Text>
              <Text
                style={[
                  styles.beachScoreCell,
                  { color: "#d90000", fontWeight: "900" },
                ]}
              >
                P
              </Text>
            </View>
            <View style={styles.beachScoreRow}>
              <Text
                style={[styles.beachScoreCell, styles.beachNameCell]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p1Name || "Team 1"}
              </Text>
              {completedSets.map((s, i) => (
                <Text
                  key={i}
                  style={styles.beachScoreCell}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {s.p1}
                </Text>
              ))}
              <Text
                style={[styles.beachScoreCell, styles.beachActiveCell]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p1Sets}
              </Text>
              <Text
                style={[styles.beachScoreCell, styles.beachPointCell]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p1Points}
              </Text>
            </View>
            <View style={styles.beachScoreRow}>
              <Text
                style={[styles.beachScoreCell, styles.beachNameCell]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p2Name || "Team 2"}
              </Text>
              {completedSets.map((s, i) => (
                <Text
                  key={i}
                  style={styles.beachScoreCell}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {s.p2}
                </Text>
              ))}
              <Text
                style={[styles.beachScoreCell, styles.beachActiveCell]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p2Sets}
              </Text>
              <Text
                style={[styles.beachScoreCell, styles.beachPointCell]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p2Points}
              </Text>
            </View>
          </View>

          <View style={styles.actionArea}>
            <View style={styles.beachPlayerCardGlass}>
              <Text
                style={styles.beachActionName}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p1Name || "Team 1"}
              </Text>
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  {
                    backgroundColor: "#ffb347",
                    borderWidth: 2,
                    borderColor: "#000",
                  },
                ]}
                onPress={() => handleVolleyScore(1)}
              >
                <Text style={styles.beachScoreButtonText}>+ Point</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.beachPlayerCardGlass}>
              <Text
                style={styles.beachActionName}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p2Name || "Team 2"}
              </Text>
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  {
                    backgroundColor: "#ffb347",
                    borderWidth: 2,
                    borderColor: "#000",
                  },
                ]}
                onPress={() => handleVolleyScore(2)}
              >
                <Text style={styles.beachScoreButtonText}>+ Point</Text>
              </TouchableOpacity>
            </View>
          </View>

          {history.length > 0 && (
            <TouchableOpacity
              style={[
                styles.beachUndoButton,
                {
                  alignSelf: "center",
                  marginTop: 15,
                  width: "100%",
                  alignItems: "center",
                },
              ]}
              onPress={handleUndo}
            >
              <Text style={styles.beachUndoButtonText}>↩ Undo</Text>
            </TouchableOpacity>
          )}

          {showSideChangeReminder && (
            <View style={styles.beachSideChangeAlert}>
              <Text style={styles.beachSideChangeText}>
                🔄 CHANGE SIDES! 🔄
              </Text>
            </View>
          )}

          <View style={styles.bottomActionsBox}>
            <TouchableOpacity
              style={styles.beachUndoButton}
              onPress={handleLiveShare}
            >
              <Text style={styles.beachUndoButtonText}>
                📡 Share Live Score
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setCurrentScreen("sportSelect");
                resetFullMatch();
              }}
            >
              <Text style={styles.beachCancelButtonText}>Cancel Match</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  if (currentScreen === "match") {
    return (
      <ImageBackground
        source={courtBackground}
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.overlayLight}>
          <View style={[styles.headerAreaTextLogo, { marginBottom: 20 }]}>
            <Text style={[styles.mainTitleText, { fontSize: 40 }]}>
              MatchPoint
            </Text>
            <Text style={styles.setupSubtitleText}>Courtside companion</Text>
          </View>
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>⏱ {formatTime(elapsedSeconds)}</Text>
          </View>

          {matchId && (
            <View style={styles.liveIndicator}>
              <Text style={styles.liveIndicatorText}>
                ● LIVE BROADCAST: {matchId}
              </Text>
            </View>
          )}
          <View style={styles.ruleBanner}>
            <Text style={styles.ruleInfo}>
              {format === "classic" ? "Classic" : "Fast4"} |{" "}
              {noAdRule ? "No-Ad" : "Ad"}
              {isMatchTiebreak
                ? `\n🎾 MATCH TIEBREAK TO ${matchTbLength} 🎾`
                : ""}
            </Text>
          </View>
          <View style={styles.tvScoreboardGlass}>
            <View style={styles.scoreRowHeader}>
              <Text style={[styles.scoreCell, styles.nameCell]}></Text>
              {completedSets.map((_, i) => (
                <Text key={i} style={styles.scoreCell}>
                  S{i + 1}
                </Text>
              ))}
              <Text style={[styles.scoreCell, styles.activeHeaderCell]}>G</Text>
              <Text style={[styles.scoreCell, styles.pointHeaderCell]}>P</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text
                style={[styles.scoreCell, styles.nameCell]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p1Name || "P1"}
              </Text>
              {completedSets.map((s, i) => (
                <Text
                  key={i}
                  style={styles.scoreCell}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {s.p1}
                </Text>
              ))}
              <Text
                style={[styles.scoreCell, styles.activeCell]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p1Games}
              </Text>
              <Text
                style={[styles.scoreCell, styles.pointCell]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {isTiebreak ? p1Points : getTennisScore(p1Points)}
              </Text>
            </View>
            <View style={styles.scoreRow}>
              <Text
                style={[styles.scoreCell, styles.nameCell]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p2Name || "P2"}
              </Text>
              {completedSets.map((s, i) => (
                <Text
                  key={i}
                  style={styles.scoreCell}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {s.p2}
                </Text>
              ))}
              <Text
                style={[styles.scoreCell, styles.activeCell]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p2Games}
              </Text>
              <Text
                style={[styles.scoreCell, styles.pointCell]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {isTiebreak ? p2Points : getTennisScore(p2Points)}
              </Text>
            </View>
          </View>
          <View style={styles.actionArea}>
            <View style={styles.playerCardGlass}>
              <Text
                style={styles.actionName}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p1Name || "P1"}
              </Text>
              <TouchableOpacity
                style={styles.scoreButton}
                onPress={() => handleTennisScore(1)}
              >
                <Text style={styles.scoreButtonText}>+ Point</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.playerCardGlass}>
              <Text
                style={styles.actionName}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {p2Name || "P2"}
              </Text>
              <TouchableOpacity
                style={styles.scoreButton}
                onPress={() => handleTennisScore(2)}
              >
                <Text style={styles.scoreButtonText}>+ Point</Text>
              </TouchableOpacity>
            </View>
          </View>

          {history.length > 0 && (
            <TouchableOpacity
              style={[
                styles.undoButton,
                {
                  alignSelf: "center",
                  marginTop: 15,
                  width: "100%",
                  alignItems: "center",
                },
              ]}
              onPress={handleUndo}
            >
              <Text style={styles.undoButtonText}>↩ Undo</Text>
            </TouchableOpacity>
          )}

          <View style={styles.bottomActionsBox}>
            <TouchableOpacity
              style={styles.liveShareBtn}
              onPress={handleLiveShare}
            >
              <Text style={styles.liveShareBtnText}>📡 Share Live Score</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setCurrentScreen("sportSelect");
                resetFullMatch();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel Match</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2b3a2e" },
  overlayDark: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  overlayLight: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  headerAreaTextLogo: {
    marginBottom: 50,
    alignItems: "center",
    width: "100%",
  },
  mainTitleText: {
    fontSize: 56,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    color: "#FDF6E3",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowRadius: 10,
    letterSpacing: 2,
    textAlign: "center",
  },
  setupSubtitleText: {
    fontSize: 24,
    fontWeight: "500",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    color: "#FDF6E3",
    opacity: 0.9,
    textAlign: "center",
    marginTop: 5,
  },

  mainSelectLabel: {
    fontSize: 34,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    marginTop: 10,
    marginBottom: 40,
    color: "#FDF6E3",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowRadius: 5,
    letterSpacing: 1,
  },

  // TENNIS STYLES
  timerBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 25,
    alignSelf: "center",
    marginBottom: 15,
  },
  timerText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 22,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
  },
  Label: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    marginTop: 35,
    marginBottom: 15,
    color: "#FDF6E3",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    padding: 25,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  glassInput: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    padding: 18,
    borderRadius: 14,
    fontSize: 16,
    color: "#fff",
    marginBottom: 15,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  ballOptionContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 15,
  },
  ballWrapper: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    backgroundColor: "transparent",
  },
  ballWrapperUnselected: { backgroundColor: "rgba(255, 255, 255, 0.28)" },
  ballWrapperUnselectedDark: { backgroundColor: "rgba(255, 255, 255, 0.6)" },
  ballWrapperSelected: { transform: [{ scale: 1.15 }] },
  imageMask: {
    position: "absolute",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  ballGraphicSelected: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.35 }],
  },
  ballContent: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  ballText: {
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    textAlign: "center",
  },
  ballSubText: {
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    textAlign: "center",
  },
  textInactive: { color: "#FFF" },
  textActive: { color: "#1a1a1a" },

  actionButtonsContainer: { marginTop: 60, gap: 25, paddingBottom: 40 },
  startMatchButton: {
    backgroundColor: "rgba(120, 165, 90, 0.95)",
    padding: 22,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  startMatchButtonText: {
    color: "#FDF6E3",
    fontSize: 22,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    letterSpacing: 1,
  },
  historyButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 18,
    borderRadius: 30,
    alignItems: "center",
  },
  historyButtonText: {
    color: "#FDF6E3",
    fontSize: 17,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },

  tvScoreboardGlass: {
    backgroundColor: "rgba(20, 30, 20, 0.82)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  scoreRowHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
    paddingVertical: 8,
  },
  scoreRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingVertical: 12,
    alignItems: "center",
  },
  scoreCell: {
    flex: 1,
    textAlign: "center",
    fontSize: 42,
    color: "#fff",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    fontWeight: "700",
  },
  nameCell: {
    flex: 2.5,
    textAlign: "left",
    fontWeight: "800",
    fontSize: 42,
    color: "#fff",
  },
  activeHeaderCell: { color: "#DFFF00" },
  pointHeaderCell: { color: "#FFB347" },
  activeCell: {
    color: "#DFFF00",
    fontWeight: "800",
    fontSize: 42,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  pointCell: {
    color: "#FFB347",
    fontWeight: "800",
    fontSize: 42,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  actionArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  playerCardGlass: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  actionName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FDF6E3",
    marginBottom: 15,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  scoreButton: {
    backgroundColor: "rgba(255, 179, 71, 0.95)",
    paddingVertical: 18,
    borderRadius: 18,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  scoreButtonText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  bottomActionsBox: {
    marginTop: "auto",
    marginBottom: 40,
    alignItems: "center",
    gap: 18,
  },
  liveShareBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 30,
  },
  liveShareBtnText: {
    color: "#FDF6E3",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  undoButton: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 28,
  },
  undoButtonText: {
    color: "#FDF6E3",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  cancelButton: { padding: 10 },
  cancelButtonText: {
    color: "#FF6B6B",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  liveIndicator: {
    backgroundColor: "rgba(255,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
    alignSelf: "center",
  },
  liveIndicatorText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  ruleBanner: {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    padding: 12,
    borderRadius: 16,
    marginVertical: 12,
  },
  ruleInfo: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    color: "#2b3a2e",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  victoryTitle: {
    fontSize: 48,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    color: "#DFFF00",
    textAlign: "center",
    marginBottom: 30,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 10,
  },
  victorySubtitle: {
    fontSize: 24,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    color: "#FDF6E3",
    textAlign: "center",
    opacity: 0.8,
  },
  victoryScoreBox: { flexDirection: "row", gap: 15, marginBottom: 50 },
  victorySetCard: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  victorySetText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  dbCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  dbHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
    paddingBottom: 8,
    marginBottom: 10,
  },
  dbDate: {
    color: "#EEE",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  dbFormat: {
    color: "#DFFF00",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  dbPlayersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dbPlayerText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  dbWinnerText: { color: "#DFFF00", fontWeight: "900" },
  dbVsText: {
    color: "#AAA",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    fontSize: 14,
  },
  dbScoreContainer: { flexDirection: "row", justifyContent: "center", gap: 10 },
  dbSetBox: {
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dbSetScore: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  backButton: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
  },
  backButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  clearButton: { padding: 15, alignItems: "center" },
  clearButtonText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },

  // HIGH-CONTRAST BEACH VOLLEY UI STYLES
  beachOverlay: {
    flex: 1,
    backgroundColor: "rgba(79, 164, 184, 0.4)",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  beachMainTitleText: {
    fontSize: 56,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    color: "#000",
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.8)",
    textShadowRadius: 6,
  },
  beachSetupSubtitleText: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    color: "#000",
    textAlign: "center",
    marginTop: 5,
    textShadowColor: "rgba(255,255,255,0.8)",
    textShadowRadius: 4,
  },
  beachLabel: {
    fontSize: 24,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    marginTop: 30,
    marginBottom: 15,
    color: "#000",
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.8)",
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  beachBallOptionContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 35,
  },
  beachGlassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    padding: 15,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#000",
    marginBottom: 20,
  },
  beachInput: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 2,
    borderColor: "#000",
    padding: 18,
    borderRadius: 14,
    fontSize: 20,
    color: "#000",
    marginBottom: 10,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    fontWeight: "700",
  },

  beachTimerBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 25,
    alignSelf: "center",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#000",
  },
  beachTimerText: {
    color: "#000",
    fontSize: 26,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
  },

  beachScoreRowHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingVertical: 8,
  },
  beachScoreRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.3)",
    paddingVertical: 12,
    alignItems: "center",
  },
  beachScoreCell: {
    flex: 1,
    textAlign: "center",
    fontSize: 50,
    color: "#000",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
    fontWeight: "700",
  },
  beachNameCell: {
    flex: 2.5,
    textAlign: "left",
    fontWeight: "800",
    fontSize: 50,
    color: "#000",
  },
  beachActiveCell: {
    color: "#000",
    fontWeight: "800",
    fontSize: 50,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  beachPointCell: {
    color: "#000",
    fontWeight: "900",
    fontSize: 50,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },

  beachPlayerCardGlass: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  beachActionName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#000",
    marginBottom: 15,
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  beachScoreButtonText: {
    color: "#000",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },

  beachSideChangeAlert: {
    backgroundColor: "#FFB347",
    padding: 12,
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 5,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#000",
  },
  beachSideChangeText: { color: "#000", fontWeight: "900", fontSize: 20 },

  beachUndoButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#000",
  },
  beachUndoButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
  beachCancelButtonText: {
    color: "#d90000",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Cochin" : "serif",
  },
});
