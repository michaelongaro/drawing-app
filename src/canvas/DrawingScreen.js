import React, { useState, useEffect, useContext } from "react";

import { useAuth0 } from "@auth0/auth0-react";
import { v4 as uuidv4 } from "uuid";

import { CountdownCircleTimer } from "react-countdown-circle-timer";

import { useCanvas } from "./CanvasContext";
import DrawingSelectionContext from "./DrawingSelectionContext";
import PromptSelection from "./PromptSelection";
import Controls from "./Controls";

import { getDatabase, ref, set, child, get, update } from "firebase/database";

import { app } from "../util/init-firebase";

import classes from "./Canvas.module.css";

const DrawingScreen = () => {
  const DSCtx = useContext(DrawingSelectionContext);
  const { user } = useAuth0();

  const timerOptions = [
    { seconds: 60, colorArray: [60, 45, 30, 15] },
    { seconds: 180, colorArray: [180, 120, 60, 0] },
    { seconds: 300, colorArray: [300, 180, 120, 60] },
  ];

  const currentTimer = {
    60: 0,
    180: 1,
    300: 2,
  };
  const [startTimer, setStartTimer] = useState(false);
  const [countdownKey, setCountdownKey] = useState(0);
  const [drawingTime, setDrawingTime] = useState(60);

  const { canvasRef, prepareCanvas, clearCanvas, finishDrawing, draw } =
    useCanvas();

  useEffect(() => {
    document.addEventListener("mousemove", draw);
    document.documentElement.addEventListener("mouseenter", draw, {
      once: true,
    });
    return () => {
      document.removeEventListener("mousemove", draw);
      document.documentElement.removeEventListener("mouseenter", draw, {
        once: true,
      });
    };
  });

  const [showCanvas, setShowCanvas] = useState(classes.hide);

  const [showCountdownOverlay, setShowCountdownOverlay] = useState(
    classes.overlayBreathingBackground
  );

  const [showCanvasOutline, setShowCanvasOutline] = useState(
    classes.canvasOutline
  );

  const [showEndOverlay, setShowEndOverlay] = useState(classes.hide);
  const [showEndOutline, setShowEndOutline] = useState(classes.hide);

  useEffect(() => {
    if (!DSCtx.showPaletteChooser) {
      setShowCountdownOverlay(classes.overlayBreathingBackground);
      setShowCanvasOutline(classes.canvasOutline);
      setShowCanvas(classes.hide);
    }
  }, [DSCtx.showPaletteChooser]);

  const renderTime = ({ remainingTime }) => {
    if (remainingTime === 0) {
      return (
        <div style={{ fontFamily: "Montserrat" }}>
          <div style={{ fontSize: "1em", userSelect: "none" }}>Time's Up!</div>
        </div>
      );
    }

    return (
      <div style={{ fontFamily: "Montserrat" }}>
        <div style={{ fontSize: "1em", userSelect: "none" }}>
          {remainingTime}
        </div>
      </div>
    );
  };

  // refactor later so that you aren't repeating same function over and over
  // const pushToDB = (pushDrawing, seconds, pushToProfile) => {
  //   if (pushDrawing) {

  //   }
  // }

  const sendToDB = () => {
    setShowCanvas(classes.hide);

    const canvas = canvasRef.current;
    const title = DSCtx.chosenPrompt;

    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const uniqueID = uuidv4();

    let canvasContents = canvas.toDataURL();

    const db = getDatabase(app);
    const dbRef = ref(getDatabase(app));

    // check to see if this title has already been drawn + add it
    if (DSCtx.drawingTime === 60) {
      get(child(dbRef, `titles/60/${title}`)).then((snapshot) => {
        if (snapshot.exists()) {
          let prev_post = snapshot.val()["drawingID"];
          prev_post.push(uniqueID);
          update(ref(db, "titles/60/" + title), {
            drawingID: prev_post,
          });
        } else {
          set(ref(db, "titles/60/" + title), {
            drawingID: [uniqueID],
          });
        }
      });
    }

    if (DSCtx.drawingTime === 180) {
      get(child(dbRef, `titles/180/${title}`)).then((snapshot) => {
        if (snapshot.exists()) {
          let prev_post = snapshot.val()["drawingID"];
          prev_post.push(uniqueID);
          update(ref(db, "titles/180/" + title), {
            drawingID: prev_post,
          });
        } else {
          set(ref(db, "titles/180/" + title), {
            drawingID: [uniqueID],
          });
        }
      });
    }

    if (DSCtx.drawingTime === 300) {
      get(child(dbRef, `titles/300/${title}`)).then((snapshot) => {
        if (snapshot.exists()) {
          let prev_post = snapshot.val()["drawingID"];
          prev_post.push(uniqueID);
          update(ref(db, "titles/300/" + title), {
            drawingID: prev_post,
          });
        } else {
          set(ref(db, "titles/300/" + title), {
            drawingID: [uniqueID],
          });
        }
      });
    }

    get(child(dbRef, `totalDrawings`)).then((snapshot) => {
      set(ref(db, "totalDrawings"), {
        count: snapshot.val().count + 1,
      });
    });

    // posting actual drawing object
    set(ref(db, "drawings/" + uniqueID), {
      title: title,
      image: canvasContents,
      seconds: DSCtx.drawingTime,
      date: `${month}-${day}-${year}`,
      drawnBy: user.sub,
      index: uniqueID,
    });

    // post title in profile/titles object
    if (DSCtx.drawingTime === 60) {
      get(child(dbRef, `users/${user.sub}/titles/60/${title}`)).then(
        (snapshot) => {
          if (snapshot.exists()) {
            let prev_post = snapshot.val()["drawingID"];
            prev_post.push(uniqueID);
            update(ref(db, `users/${user.sub}/titles/60/${title}`), {
              drawingID: prev_post,
            });
          } else {
            set(ref(db, `users/${user.sub}/titles/60/${title}`), {
              drawingID: [uniqueID],
            });
          }
        }
      );
    }

    if (DSCtx.drawingTime === 180) {
      get(child(dbRef, `users/${user.sub}/titles/180/${title}`)).then(
        (snapshot) => {
          if (snapshot.exists()) {
            let prev_post = snapshot.val()["drawingID"];
            prev_post.push(uniqueID);
            update(ref(db, `users/${user.sub}/titles/180/${title}`), {
              drawingID: prev_post,
            });
          } else {
            set(ref(db, `users/${user.sub}/titles/180/${title}`), {
              drawingID: [uniqueID],
            });
          }
        }
      );
    }

    if (DSCtx.drawingTime === 300) {
      get(child(dbRef, `users/${user.sub}/titles/300/${title}`)).then(
        (snapshot) => {
          if (snapshot.exists()) {
            let prev_post = snapshot.val()["drawingID"];
            prev_post.push(uniqueID);
            update(ref(db, `users/${user.sub}/titles/300/${title}`), {
              drawingID: prev_post,
            });
          } else {
            set(ref(db, `users/${user.sub}/titles/300/${title}`), {
              drawingID: [uniqueID],
            });
          }
        }
      );
    }

    DSCtx.setShowEndOverlay(true);
    DSCtx.setShowEndOutline(true);

    let tempUpdatedStatuses = DSCtx.drawingStatuses;
    if (
      tempUpdatedStatuses["60"] &&
      tempUpdatedStatuses["180"] &&
      tempUpdatedStatuses["300"]
    ) {
      tempUpdatedStatuses["extra"] = true;
    } else {
      tempUpdatedStatuses[DSCtx.drawingTime] = true;
    }
    set(
      ref(db, `users/${user.sub}/completedDailyPrompts`),
      tempUpdatedStatuses
    );

    setStartTimer(false);
    DSCtx.setDrawingTime(0);
  };

  useEffect(() => {
    if (DSCtx.drawingTime > 0) {
      setDrawingTime(DSCtx.drawingTime);
    }
  }, [DSCtx.drawingTime]);

  useEffect(() => {
    if (DSCtx.showEndOverlay && DSCtx.showEndOutline) {
      setShowEndOverlay(classes.overlayBreathingBackground);
      setShowEndOutline(classes.canvasOutline);
    } else {
      setShowEndOverlay(classes.hide);
      setShowEndOutline(classes.hide);
    }
  }, [DSCtx.showEndOverlay, DSCtx.showEndOutline]);

  useEffect(() => {
    if (DSCtx.seconds > 0) {
      setTimeout(() => DSCtx.setSeconds(DSCtx.seconds - 1), 1000);
    } else {
      setShowCountdownOverlay(classes.hide);
      setShowCanvasOutline(classes.hide);

      clearCanvas();

      setShowCanvas(classes.canvasBreathingBackground);

      setCountdownKey((prevKey) => prevKey + 1);
      setStartTimer(true);
    }
  }, [DSCtx.seconds]);

  useEffect(() => {
    prepareCanvas();
    const id = setTimeout(sendToDB, DSCtx.drawingTime * 1000 + 3015);

    return () => {
      clearTimeout(id);
    };
  }, []);

  return (
    <div>
      <div className={showCountdownOverlay}>
        {DSCtx.chosenPrompt}
        <div className={showCanvasOutline}>{DSCtx.seconds}</div>
        <Controls />
      </div>

      <div className={showEndOverlay}>
        {DSCtx.chosenPrompt}
        <div className={showEndOutline} style={{ fontSize: "1em" }}>
          <PromptSelection />
        </div>
        <Controls />
      </div>

      <div className={showCanvas}>
        <div style={{ pointerEvents: "none" }}>{DSCtx.chosenPrompt}</div>
        <div style={{ position: "relative" }}>
          <div className={classes.timer}>
            <CountdownCircleTimer
              key={countdownKey}
              isPlaying={startTimer}
              duration={timerOptions[currentTimer[drawingTime]].seconds}
              size={75}
              colors={["#004777", "#F7B801", "#A30000", "#A30000"]}
              colorsTime={timerOptions[currentTimer[drawingTime]].colorArray}
            >
              {renderTime}
            </CountdownCircleTimer>
          </div>
          <div className={classes.canvasBorder}>
            <canvas
              onMouseDown={draw}
              onMouseUp={finishDrawing}
              ref={canvasRef}
            />
          </div>
        </div>
        <Controls />
      </div>
    </div>
  );
};

export default DrawingScreen;