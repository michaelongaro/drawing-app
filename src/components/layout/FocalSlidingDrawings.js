import React, { useEffect, useState } from "react";

import { getDatabase, get, ref, child } from "firebase/database";
import { app } from "../../util/init-firebase";

import classes from "./FocalSlidingDrawings.module.css";
import SlidingDrawing from "./SlidingDrawing";

const FocalSlidingDrawings = () => {
  const [randomDrawingIDs, setRandomDrawingIDs] = useState(null);
  const [fetchedImages, setFetchedImages] = useState([]);

  const dbRef = ref(getDatabase(app));

  useEffect(() => {
    getRandomDrawingIDs();
  }, []);

  useEffect(() => {
    if (randomDrawingIDs !== null) {
      getImagesFromIDs();
    }
  }, [randomDrawingIDs]);

  function getRandomDrawingIDs() {
    get(child(dbRef, `titles`)).then((snapshot) => {
      const titles60 = Object.values(snapshot.val()["60"]);
      const titles180 = Object.values(snapshot.val()["180"]);
      const titles300 = Object.values(snapshot.val()["300"]);

      const allTitles = titles60.concat(titles180, titles300);
      const tempDrawingIDs = [];

      // find 15 random indices out of allTitles.length
      for (let i = 0; i < 15; i++) {
        const actualID =
          allTitles[Math.floor(Math.random() * allTitles.length)][
            "drawingID"
          ][0];

        tempDrawingIDs.push(actualID);
      }

      setRandomDrawingIDs(tempDrawingIDs);
    });
  }

  function getImagesFromIDs() {
    const tempDrawings = [];
    const promises = [];
    for (const id of randomDrawingIDs) {
      promises.push(get(child(dbRef, `drawings/${id}`)));
    }

    Promise.all(promises).then((results) => {
      for (const result of results) {
        tempDrawings.push(result.val()["image"]);
      }
      setFetchedImages(tempDrawings);
    });
  }
  // 99.99% chance this is hella rerendering/fetching, figure out how to fetch the 15* images and
  // again ideally store them in memory until a refresh, and don't refetch them

  return (
    <div className={classes.fullWidth}>
      {fetchedImages.length > 0 ? (
        fetchedImages.map((image, i) => (
          <SlidingDrawing key={i} drawing={image} id={i} />
        ))
      ) : (
        <div></div>
      )}
      <div className={classes.centerTextContainer}>
        <div style={{ fontSize: "3em" }}>Search</div>
        <div style={{ fontSize: "1.15em" }}>1000s of drawings</div>
      </div>
    </div>
  );
};

export default FocalSlidingDrawings;
