import React, { useEffect, useState } from "react";

import GallaryItem from "./GallaryItem";
import ProfilePicture from "./ProfilePicture";

import { getDatabase, get, onValue, ref, child } from "firebase/database";
import { app } from "../../util/init-firebase";

import OneMinuteIcon from "../../svgs/OneMinuteIcon";
import ThreeMinuteIcon from "../../svgs/ThreeMinuteIcon";
import FiveMinuteIcon from "../../svgs/FiveMinuteIcon";

import baseClasses from "../../index.module.css";
import classes from "./FeaturedLikes.module.css";

const FeaturedLikes = () => {
  const [dailyMostLiked, setDailyMostLiked] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState(0);
  const [selected, setSelected] = useState([classes.highlighted, "", ""]);

  useEffect(() => {
    const db = getDatabase(app);
    const dbRef = ref(getDatabase(app));

    onValue(ref(db, "dailyMostLiked"), (snapshot) => {
      let promises = [];
      let formattedLikes = [];

      if (snapshot.exists()) {
        for (const drawing of Object.values(snapshot.val())) {
          promises.push(get(child(dbRef, `drawings/${drawing.id}`)));
        }

        Promise.all(promises).then((results) => {
          for (const idx in results) {
            formattedLikes.push(results[idx].val());
          }

          setDailyMostLiked(formattedLikes);
        });
      }
    });
  }, []);

  function selectTimer(index) {
    let tempSelected = [...selected];
    tempSelected[currentDrawing] = "";
    tempSelected[index] = classes.highlighted;
    setSelected(tempSelected);
  }

  if (!dailyMostLiked) {
    return null;
  }

  return (
    <div className={classes.marginFlex}>
      <div style={{ fontSize: "1.65em" }}>Daily Featured Drawings</div>

      <div className={classes.overallContain}>
        <div className={classes.leftSideContain}>
          {/* --------------- 60 ------------------- */}
          <div
            style={{
              backgroundPosition: selected[0] ? "100px" : "",
              opacity: selected[0] ? 1 : 0.6,
            }}
            className={`${classes.durationButton} ${classes.redBackground}`}
            onClick={() => {
              selectTimer(0);
              setCurrentDrawing(0);
            }}
          >
            <ProfilePicture user={dailyMostLiked[0].drawnBy} size="medium" />

            <div
              className={`${baseClasses.baseVertFlex} ${classes.shadowText}`}
            >
              <div>{dailyMostLiked[0].title.split(" ")[0]}</div>
              <div>{dailyMostLiked[0].title.split(" ")[1]}</div>
            </div>

            <OneMinuteIcon dimensions={"3.5em"} />
          </div>

          {/* --------------- 180 ------------------- */}
          <div
            style={{
              backgroundPosition: selected[1] ? "100px" : "",
              opacity: selected[1] ? 1 : 0.6,
            }}
            className={`${classes.durationButton} ${classes.yellowBackground}`}
            onClick={() => {
              selectTimer(1);
              setCurrentDrawing(1);
            }}
          >
            <ProfilePicture user={dailyMostLiked[1].drawnBy} size="medium" />

            <div
              className={`${baseClasses.baseVertFlex} ${classes.shadowText}`}
            >
              <div>{dailyMostLiked[1].title.split(" ")[0]}</div>
              <div>{dailyMostLiked[1].title.split(" ")[1]}</div>
            </div>

            <ThreeMinuteIcon dimensions={"3.5em"} />
          </div>

          {/* --------------- 300 ------------------- */}
          <div
            style={{
              backgroundPosition: selected[2] ? "100px" : "",
              opacity: selected[2] ? 1 : 0.6,
            }}
            className={`${classes.durationButton} ${classes.greenBackground}`}
            onClick={() => {
              selectTimer(2);
              setCurrentDrawing(2);
            }}
          >
            <ProfilePicture user={dailyMostLiked[2].drawnBy} size="medium" />

            <div
              className={`${baseClasses.baseVertFlex} ${classes.shadowText}`}
            >
              <div>{dailyMostLiked[2].title.split(" ")[0]}</div>
              <div>{dailyMostLiked[2].title.split(" ")[1]}</div>
            </div>

            <FiveMinuteIcon dimensions={"3.5em"} />
          </div>
        </div>

        {/* ----------- Shown Drawing ----------- */}
        {/* honestly could have all of them here, and just change opacity of which one is shown */}
        <div className={classes.drawingContainer}>
          <GallaryItem
            drawingID={dailyMostLiked[currentDrawing].index}
            settings={{
              width: 95,
              forHomepage: true,
              forPinnedShowcase: false,
              forPinnedItem: false,
              skeleHeight: "30em",
              skeleDateWidth: "6em",
              skeleTitleWidth: "6em",
              widthRatio: 2.162,
              heightRatio: 2.162,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FeaturedLikes;
