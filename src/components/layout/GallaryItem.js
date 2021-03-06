import React from "react";
import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

import ProfilePicture from "./ProfilePicture";
import downloadDrawing from "../../util/downloadDrawing";
import SearchContext from "./SearchContext";
import FavoritesContext from "./FavoritesContext";
import ModalContext from "./ModalContext";

import DrawingModal from "./DrawingModal";
import UserModal from "./UserModal";
import Card from "../../ui/Card";

import CopyToClipboard from "./CopyToClipboard";
import DownloadIcon from "../../svgs/DownloadIcon";
import HeartOutlineIcon from "../../svgs/HeartOutlineIcon";
import HeartFilledIcon from "../../svgs/HeartFilledIcon";
import HeartBrokenIcon from "../../svgs/HeartBrokenIcon";
import FiveMinuteIcon from "../../svgs/FiveMinuteIcon";
import OneMinuteIcon from "../../svgs/OneMinuteIcon";
import ThreeMinuteIcon from "../../svgs/ThreeMinuteIcon";
import ExitIcon from "../../svgs/ExitIcon";
import GarbageIcon from "../../svgs/GarbageIcon";

import {
  getDatabase,
  get,
  ref,
  onValue,
  remove,
  update,
  set,
  child,
} from "firebase/database";

import {
  getDownloadURL,
  getStorage,
  deleteObject,
  ref as ref_storage,
  uploadBytes,
} from "firebase/storage";

import { app } from "../../util/init-firebase";

import classes from "./GallaryItem.module.css";
import baseClasses from "../../index.module.css";

const GallaryItem = ({
  drawingID,
  settings,
  idx,
  dbPath,
  openedFromUserModal,
}) => {
  const location = useLocation();
  const { isLoading, isAuthenticated } = useAuth0();

  const searchCtx = useContext(SearchContext);
  const favoritesCtx = useContext(FavoritesContext);
  const modalCtx = useContext(ModalContext);

  const db = getDatabase(app);
  const dbRef = ref(getDatabase(app));
  const storage = getStorage();

  const drawingModalRef = useRef(null);
  const confirmDeleteModalRef = useRef();

  // const imageDimensionsRef = useCallback((node) => {
  //   if (node !== null) {
  //     // setSkeletonWidth(node.getBoundingClientRect().width);
  //     // setSkeletonHeight(node.getBoundingClientRect().height);
  //     console.log(
  //       node.getBoundingClientRect().width,
  //       node.getBoundingClientRect().height
  //     );
  //     console.log(node.offsetWidth, node.offsetHeight);

  //     setSkeletonWidth(node.offsetWidth);
  //     setSkeletonHeight(node.offsetHeight);
  //   }
  // }, []);

  // const [skeletonWidth, setSkeletonWidth] = useState(0);
  // const [skeletonHeight, setSkeletonHeight] = useState(0);

  // const [showImage, setShowImage] = useState(false);

  const [drawingTotalLikes, setDrawingTotalLikes] = useState(0);
  const [drawingDailyLikes, setDrawingDailyLikes] = useState(0);

  const [imageElementLoaded, setImageElementLoaded] = useState(false);

  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const [loadUserModal, setLoadUserModal] = useState(false);

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);

  const [isFetching, setIsFetching] = useState(true);
  const [drawingDetails, setDrawingDetails] = useState();
  const [fetchedDrawing, setFetchedDrawing] = useState();
  const [artistUsername, setArtistUsername] = useState();

  // user hover states
  const [hoveringOnHeart, setHoveringOnHeart] = useState(false);
  const [hoveringOnImage, setHoveringOnImage] = useState(false);
  const [hoveringOnDeleteButton, setHoveringOnDeleteButton] = useState(false);
  const [hoveringOnLikesTooltip, setHoveringOnLikesTooltip] = useState(false);
  const [hoveringOnProfilePicture, setHoveringOnProfilePicture] =
    useState(false);
  const [hoveringOnUsernameTooltip, setHoveringOnUsernameTooltip] =
    useState(false);

  const [ableToShowProfilePicture, setAbleToShowProfilePicture] =
    useState(false);

  // states for showing "signup/login" tooltip when clicking like button when unregistered
  const [showTooltip, setShowTooltip] = useState(false);

  const [showTempBaselineSkeleton, setShowTempBaselineSkeleton] =
    useState(true);

  const [deletionCheckpointReached, setDeletionCheckpointReached] =
    useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || (isAuthenticated && drawingDetails)) {
        if (location.pathname === "/" || location.pathname === "/explore") {
          if (!ableToShowProfilePicture) {
            setAbleToShowProfilePicture(
              modalCtx.drawingModalOpened || !modalCtx.userModalOpened
            );
          }
        }
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    location,
    ableToShowProfilePicture,
    modalCtx.drawingModalOpened,
    modalCtx.userModalOpened,
    drawingDetails,
  ]);

  useEffect(() => {
    if (!modalCtx.userModalOpened) {
      setShowUserModal(false);
      setLoadUserModal(false);
    }
    if (!openedFromUserModal) {
      if (!modalCtx.drawingModalOpened) {
        setShowDrawingModal(false);
      }
    } else if (openedFromUserModal) {
      if (!modalCtx.drawingModalFromUserOpened) {
        setShowDrawingModal(false);
      }
    }
  }, [
    openedFromUserModal,
    modalCtx.userModalOpened,
    modalCtx.drawingModalOpened,
    modalCtx.drawingModalFromUserOpened,
  ]);

  useEffect(() => {
    get(child(dbRef, `drawings/${drawingID}`)).then((snapshot) => {
      if (snapshot.exists()) {
        setDrawingDetails(snapshot.val());
      }
    });

    getDownloadURL(ref_storage(storage, `drawings/${drawingID}.jpg`)).then(
      (url) => {
        setFetchedDrawing(url);
      }
    );

    setShowTempBaselineSkeleton(true);

    const timerID = setTimeout(() => setShowTempBaselineSkeleton(false), 400);

    return () => {
      clearTimeout(timerID);
    };
  }, [drawingID]);

  useEffect(() => {
    if (drawingDetails && fetchedDrawing) {
      setIsFetching(false);
    }
  }, [drawingDetails, fetchedDrawing]);

  useEffect(() => {
    function modalHandler(event) {
      if (showConfirmDeleteModal) {
        if (!confirmDeleteModalRef.current.contains(event.target)) {
          setShowConfirmDeleteModal(false);
        }
      }
    }

    document.addEventListener("click", modalHandler);
    return () => {
      document.removeEventListener("click", modalHandler);
    };
  }, [showConfirmDeleteModal]);

  useEffect(() => {
    if (hoveringOnProfilePicture || hoveringOnUsernameTooltip) {
      document.documentElement.style.setProperty("--shimmerPlayState", "true");
    } else {
      document.documentElement.style.setProperty("--shimmerPlayState", "false");
    }
  }, [hoveringOnProfilePicture, hoveringOnUsernameTooltip]);

  useEffect(() => {
    if (drawingDetails) {
      onValue(
        ref(
          db,
          `drawingLikes/${drawingDetails.seconds}/${drawingDetails.index}`
        ),
        (snapshot) => {
          if (snapshot.exists()) {
            setDrawingTotalLikes(snapshot.val()["totalLikes"]);
            setDrawingDailyLikes(snapshot.val()["dailyLikes"]);
          }
        }
      );

      get(child(dbRef, `users/${drawingDetails.drawnBy}/preferences`)).then(
        (snapshot) => {
          if (snapshot.exists()) {
            setArtistUsername(snapshot.val().username);
          }
        }
      );
    }
  }, [drawingDetails]);

  useEffect(() => {
    if (deletionCheckpointReached) {
      searchCtx.getGallary(0, 6, 6, idx, dbPath);
      console.log("called getGallary with", idx, dbPath, "066");
      setDeletionCheckpointReached(false);
    }
  }, [dbPath, idx, deletionCheckpointReached]);

  useEffect(() => {
    let setTimeoutID;
    if (showTooltip) {
      setTimeoutID = setTimeout(() => setShowTooltip(false), 1250);
    }

    return () => {
      clearTimeout(setTimeoutID);
    };
  }, [showTooltip]);

  function toggleFavoriteStatusHandler() {
    if (
      favoritesCtx.itemIsFavorite(
        drawingID,
        drawingDetails.seconds,
        drawingDetails.title
      )
    ) {
      favoritesCtx.removeFavorite(
        drawingID,
        drawingDetails.seconds,
        drawingDetails.title,
        drawingTotalLikes - 1,
        drawingDailyLikes - 1
      );
    } else {
      favoritesCtx.addFavorite(
        drawingID,
        drawingDetails.seconds,
        drawingDetails.title,
        drawingTotalLikes + 1,
        drawingDailyLikes + 1
      );
    }
  }

  function deleteDrawing() {
    const title = drawingDetails.title;
    const seconds = drawingDetails.seconds;
    const uniqueID = drawingDetails.index;
    const user = drawingDetails.drawnBy;

    setShowConfirmDeleteModal(false);

    // Removing From /drawingLikes
    remove(ref(db, `drawingLikes/${seconds}/${uniqueID}`));

    // Removing from /drawings
    remove(ref(db, `drawings/${uniqueID}`));

    // Removing from storage
    deleteObject(ref_storage(storage, `drawings/${drawingID}.jpg`));

    // Removing from /titles
    get(child(dbRef, `titles/${seconds}/${title}`)).then((snapshot) => {
      if (snapshot.exists()) {
        let drawingIDs = snapshot.val()["drawingID"];
        console.log("total Ids", drawingIDs);
        // removing the index that has the corresponding drawingID
        drawingIDs.splice(drawingIDs.indexOf(uniqueID), 1);
        if (drawingIDs.length === 0) {
          console.log("removing whole reg titles of", title);
          remove(ref(db, `titles/${seconds}/${title}`));
        } else {
          console.log("updating reg titles of", title);

          update(ref(db, `titles/${seconds}/${title}`), {
            drawingID: drawingIDs,
          });
        }
      }
    });

    // Removing from /users/user.sub/titles
    get(child(dbRef, `users/${user}/titles/${seconds}/${title}`)).then(
      (snapshot) => {
        if (snapshot.exists()) {
          let drawingIDs = snapshot.val()["drawingID"];

          // removing the index that has the corresponding drawingID
          drawingIDs.splice(drawingIDs.indexOf(uniqueID), 1);
          if (drawingIDs.length === 0) {
            console.log("removing whole reg titles of", title);

            remove(ref(db, `users/${user}/titles/${seconds}/${title}`)).then(
              () => {
                setDeletionCheckpointReached(true);
              }
            );
          } else {
            console.log("updating reg titles of", title);

            update(ref(db, `users/${user}/titles/${seconds}/${title}`), {
              drawingID: drawingIDs,
            }).then(() => {
              setDeletionCheckpointReached(true);
            });
          }
        }
      }
    );

    // Removing from /users/user.sub/likes (if it exists there)
    get(child(dbRef, `users/${user}/likes/${seconds}`)).then((snapshot) => {
      if (snapshot.exists()) {
        // checking to see if drawing was liked by user
        if (Object.keys(snapshot.val()).includes(title)) {
          let numberOfTitles = Object.keys(snapshot.val()).length;
          let drawingIDs = snapshot.val()[title]["drawingID"];

          // removing the index that has the corresponding drawingID
          drawingIDs.splice(drawingIDs.indexOf(uniqueID), 1);

          if (drawingIDs.length === 0) {
            // if that image was the last liked image for current duration, revert value of
            // duration object to false
            if (numberOfTitles !== 1) {
              remove(ref(db, `users/${user}/likes/${seconds}/${title}`));
            } else {
              update(ref(db, `users/${user}/likes/${seconds}`), false);
            }
          } else {
            update(ref(db, `users/${user}/likes/${seconds}/${title}`), {
              drawingID: drawingIDs,
            });
          }
        }
      }
    });

    // Removing from /users/user.sub/pinnedArt (if it exists there)
    get(child(dbRef, `users/${user}/pinnedArt`)).then((snapshot) => {
      if (snapshot.exists()) {
        let drawingIDs = snapshot.val();

        // removing the index that has the corresponding drawingID
        if (drawingIDs["60"] === uniqueID) drawingIDs["60"] = "";
        if (drawingIDs["180"] === uniqueID) drawingIDs["180"] = "";
        if (drawingIDs["300"] === uniqueID) drawingIDs["300"] = "";

        update(ref(db, `users/${user}/pinnedArt`), drawingIDs);
      }
    });

    // Decrementing totalDrawings
    get(child(dbRef, "totalDrawings")).then((snapshot) => {
      if (snapshot.exists()) {
        let drawingCount = snapshot.val()["count"];

        update(ref(db, "totalDrawings"), { count: drawingCount - 1 });
      }
    });
  }

  return (
    <div
      onMouseEnter={() => {
        setHoveringOnImage(true);
      }}
      onMouseLeave={() => {
        setHoveringOnImage(false);
      }}
      // used to be conditional between 100vw and 100%
      style={{
        minWidth: "100%",
        minHeight: "100%",
      }}
    >
      {/* confirm delete modal */}
      <div
        style={{
          opacity: showConfirmDeleteModal ? 1 : 0,
          pointerEvents: showConfirmDeleteModal ? "auto" : "none",
        }}
        className={classes.modal}
      >
        <div className={classes.confirmDeleteText} ref={confirmDeleteModalRef}>
          <div>
            <GarbageIcon dimensions={"3em"} />
          </div>

          <div>Are you sure you want to delete</div>
          <div>"{drawingDetails && drawingDetails.title}"?</div>

          <div className={classes.deleteModalControls}>
            <button
              style={{
                pointerEvents: showConfirmDeleteModal ? "auto" : "none",
              }}
              className={classes.closeButton}
              onClick={() => {
                if (showConfirmDeleteModal) setShowConfirmDeleteModal(false);
              }}
            >
              <ExitIcon />
            </button>
            <button
              style={{
                pointerEvents: showConfirmDeleteModal ? "auto" : "none",
              }}
              className={classes.editButton}
              onClick={() => {
                if (showConfirmDeleteModal) deleteDrawing();
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>

      {/* ----- user modal ------- */}
      <div
        style={{
          opacity: showUserModal && modalCtx.userModalOpened ? 1 : 0,
          pointerEvents:
            showUserModal && modalCtx.userModalOpened ? "auto" : "none",
          transition: "all 200ms",
        }}
        className={classes.modal}
      >
        {loadUserModal && <UserModal user={drawingDetails.drawnBy} />}
      </div>

      {/* drawing modal */}
      <div
        style={{
          opacity:
            showDrawingModal &&
            (openedFromUserModal
              ? modalCtx.drawingModalFromUserOpened
              : modalCtx.drawingModalOpened)
              ? 1
              : 0,
          pointerEvents:
            showDrawingModal &&
            (openedFromUserModal
              ? modalCtx.drawingModalFromUserOpened
              : modalCtx.drawingModalOpened)
              ? "auto"
              : "none",
          transition: "all 200ms",
        }}
        className={classes.modal}
      >
        <DrawingModal
          drawingID={drawingID}
          drawing={fetchedDrawing}
          settings={settings}
          drawingMetadata={drawingDetails}
          artistUsername={artistUsername}
          idx={idx}
          dbPath={dbPath}
          showDrawingModal={showDrawingModal}
          openedFromUserModal={openedFromUserModal}
        />
      </div>

      {/* image container */}
      <div
        style={{ gap: "1em" }}
        className={baseClasses.baseVertFlex}
        ref={drawingModalRef}
      >
        <Card>
          {/* ------ imageinfo -------- */}

          {/* image loading skeleton */}
          <div
            style={{
              display:
                isFetching || showTempBaselineSkeleton || !imageElementLoaded
                  ? "block"
                  : "none",
              width: window.innerWidth / settings.widthRatio,
              height: window.innerHeight / settings.heightRatio,
              borderRadius: "1em 1em 0 0",
            }}
            className={classes.skeletonLoading}
          ></div>

          {/* actual image */}
          <div
            className={classes.glossOver}
            style={{ position: "relative" }}
            onClick={() => {
              if (
                !settings.forHomepage &&
                !settings.forPinnedShowcase &&
                !settings.forPinnedItem &&
                // needed so that when clicking on delete button drawing modal doesn't show
                !hoveringOnDeleteButton
              ) {
                if (openedFromUserModal) {
                  modalCtx.setDrawingModalFromUserOpened(true);
                  setShowDrawingModal(true);
                } else {
                  modalCtx.setDrawingModalOpened(true);
                  setShowDrawingModal(true);
                }
              }
            }}
          >
            <img
              style={{
                display:
                  !isFetching && !showTempBaselineSkeleton && imageElementLoaded
                    ? "block"
                    : "none",
                cursor: settings.forHomepage ? "auto" : "pointer",
                borderRadius: settings.forPinnedShowcase
                  ? "1em"
                  : "1em 1em 0 0",
                minWidth: "100%",
                minHeight: "100%",
              }}
              src={fetchedDrawing}
              alt={drawingDetails?.title ?? "drawing title"}
              onLoad={() => {
                setImageElementLoaded(true);
              }}
            />

            {/* delete drawing button */}
            <button
              className={classes.deleteButton}
              style={{
                display:
                  !isFetching && !showTempBaselineSkeleton && imageElementLoaded
                    ? "flex"
                    : "none",
                backgroundColor: hoveringOnDeleteButton ? "red" : "transparent",
                opacity:
                  location.pathname === "/profile/gallery" &&
                  hoveringOnImage &&
                  !modalCtx.userModalOpened
                    ? 1
                    : 0,
                pointerEvents:
                  location.pathname === "/profile/gallery" &&
                  hoveringOnImage &&
                  !modalCtx.userModalOpened
                    ? "auto"
                    : "none",
              }}
              onMouseEnter={() => {
                setHoveringOnDeleteButton(true);
              }}
              onMouseLeave={() => {
                setHoveringOnDeleteButton(false);
              }}
              onClick={() => setShowConfirmDeleteModal(true)}
            >
              <GarbageIcon dimensions={"1.25em"} />
            </button>

            <div
              style={{
                display:
                  !isFetching && !showTempBaselineSkeleton && imageElementLoaded
                    ? "flex"
                    : "none",
              }}
              className={`${drawingTotalLikes > 0 ? classes.likes : ""}`}
            >
              {drawingTotalLikes > 0 ? (
                <div style={{ gap: ".5em" }} className={baseClasses.baseFlex}>
                  <HeartFilledIcon dimensions={"1em"} />{" "}
                  <div>{drawingTotalLikes}</div>
                </div>
              ) : (
                ""
              )}
            </div>
          </div>

          {/* -------- metainfo --------- */}
          {settings.forPinnedShowcase ? null : (
            <div
              style={{
                fontSize:
                  location.pathname === "/profile/gallery" ||
                  location.pathname === "/profile/likes"
                    ? ".9em"
                    : "1em",
                background:
                  !isFetching && drawingDetails.hasOwnProperty("averageColor")
                    ? `linear-gradient(
                                        \n
                                        145deg,
                                        \n
                                        rgb(255, 255, 255) 0%,
                                        \n
                                        rgb(${drawingDetails["averageColor"]["r"]}, 
                                            ${drawingDetails["averageColor"]["g"]}, 
                                            ${drawingDetails["averageColor"]["b"]})
                                      )`
                    : "linear-gradient(\n    145deg,\n    rgb(255, 255, 255) 0%,\n    #c2c2c2 125%\n  )",
              }}
              className={classes.bottomContain}
            >
              {/* profile image */}
              {ableToShowProfilePicture ? (
                showTempBaselineSkeleton || isFetching ? (
                  <div
                    style={{
                      width: "3.3em",
                      height: "81%",
                      borderRadius: "50%",
                    }}
                    className={classes.skeletonLoading}
                  ></div>
                ) : (
                  <div
                    style={{
                      position: "relative",
                      cursor: "pointer",
                      width: "50px",
                      height: "50px",
                    }}
                    onClick={() => {
                      if (!modalCtx.userModalOpened) {
                        setShowUserModal(true);
                        modalCtx.setUserModalOpened(true);
                        setLoadUserModal(true);
                      } else {
                        // closing drawing modal and taking user back to original user modal
                        // done to save bandwidth and also for user clarity so they can't go
                        // multiple layers deep
                        modalCtx.setDrawingModalFromUserOpened(false);
                      }
                    }}
                    onMouseEnter={() => {
                      setHoveringOnProfilePicture(true);
                    }}
                    onMouseLeave={() => {
                      setHoveringOnProfilePicture(false);
                    }}
                  >
                    <ProfilePicture
                      user={drawingDetails.drawnBy}
                      size="small"
                    />

                    {/* username tooltip */}
                    <div
                      style={{ cursor: "pointer" }}
                      className={classes.usernameTooltipContainer}
                      onMouseEnter={() => {
                        setHoveringOnUsernameTooltip(true);
                      }}
                      onMouseLeave={() => {
                        setHoveringOnUsernameTooltip(false);
                      }}
                    >
                      <div
                        style={{
                          opacity:
                            hoveringOnProfilePicture ||
                            hoveringOnUsernameTooltip
                              ? 1
                              : 0,
                          transform:
                            hoveringOnProfilePicture ||
                            hoveringOnUsernameTooltip
                              ? "scale(1)"
                              : "scale(0)",
                          cursor: "pointer",
                          left: 0,
                          top: "70px",
                          padding: "2em",
                        }}
                        className={classes.usernameTooltip}
                      >
                        {artistUsername}
                      </div>
                    </div>
                  </div>
                )
              ) : null}

              {/* ----- drawingID data ----- */}

              {/* title */}
              {showTempBaselineSkeleton || isFetching ? (
                <div
                  style={{ width: settings.skeleTitleWidth, height: "40%" }}
                  className={classes.skeletonLoading}
                ></div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  {drawingDetails.title}
                </div>
              )}

              {/* date */}
              {showTempBaselineSkeleton || isFetching ? (
                <div
                  style={{ width: "6em", height: "40%" }}
                  className={classes.skeletonLoading}
                ></div>
              ) : (
                <div>{drawingDetails.date}</div>
              )}

              {/* seconds */}

              {/* || modalCtx.drawingModalOpened */}
              {location.pathname === "/" ? (
                showTempBaselineSkeleton || isFetching ? (
                  <div
                    style={{ width: "3em", height: "3em", borderRadius: "50%" }}
                    className={classes.skeletonLoading}
                  ></div>
                ) : (
                  <div style={{ width: "3em", height: "3em" }}>
                    {drawingDetails.seconds === 60 && (
                      <OneMinuteIcon dimensions={"3em"} />
                    )}
                    {drawingDetails.seconds === 180 && (
                      <ThreeMinuteIcon dimensions={"3em"} />
                    )}
                    {drawingDetails.seconds === 300 && (
                      <FiveMinuteIcon dimensions={"3em"} />
                    )}
                  </div>
                )
              ) : null}

              {/* like toggle */}
              {settings.forPinnedItem ? null : showTempBaselineSkeleton ||
                isFetching ? (
                <div
                  style={{ width: "3em", height: "40%" }}
                  className={classes.skeletonLoading}
                ></div>
              ) : (
                <div
                  style={{
                    position: "relative",
                    width: "1.5em",
                    height: "1.5em",
                  }}
                  onClick={() => {
                    if (!isLoading && !isAuthenticated) {
                      setShowTooltip(true);
                    } else if (!isLoading && isAuthenticated) {
                      toggleFavoriteStatusHandler();
                    }
                  }}
                  onMouseEnter={() => {
                    setHoveringOnHeart(true);
                  }}
                  onMouseLeave={() => {
                    setHoveringOnHeart(false);
                  }}
                >
                  {/* heart icon(s) */}
                  <div style={{ cursor: "pointer" }}>
                    {hoveringOnHeart ? (
                      favoritesCtx.itemIsFavorite(
                        drawingID,
                        drawingDetails.seconds,
                        drawingDetails.title
                      ) ? (
                        <HeartBrokenIcon />
                      ) : (
                        <HeartFilledIcon dimensions={"1.5em"} />
                      )
                    ) : favoritesCtx.itemIsFavorite(
                        drawingID,
                        drawingDetails.seconds,
                        drawingDetails.title
                      ) ? (
                      <HeartFilledIcon dimensions={"1.5em"} />
                    ) : (
                      <HeartOutlineIcon />
                    )}
                  </div>

                  {/* unregistered user tooltip */}
                  <div
                    style={{
                      opacity: hoveringOnLikesTooltip || showTooltip ? 1 : 0,
                      transform:
                        hoveringOnLikesTooltip || showTooltip
                          ? "scale(1)"
                          : "scale(0)",
                    }}
                    className={classes.likesTooltip}
                    onMouseEnter={() => {
                      setHoveringOnLikesTooltip(true);
                    }}
                    onMouseLeave={() => {
                      setHoveringOnLikesTooltip(false);
                    }}
                  >
                    Sign up or Log in to like drawings
                  </div>
                </div>
              )}

              {/* move to % widths */}

              {/* for homepage daily featured gallaryitem */}
              {settings.forHomepage ? (
                isFetching ? (
                  <div
                    style={{ width: "4em", height: "50%" }}
                    className={classes.skeletonLoading}
                  ></div>
                ) : (
                  <CopyToClipboard url={fetchedDrawing} />
                )
              ) : null}

              {settings.forHomepage ? (
                isFetching ? (
                  <div
                    style={{ width: "4em", height: "50%" }}
                    className={classes.skeletonLoading}
                  ></div>
                ) : (
                  <button
                    style={{ display: "flex", gap: "0.75em", fontSize: "16px" }}
                    className={`${baseClasses.activeButton} ${baseClasses.baseFlex}`}
                    onClick={() =>
                      downloadDrawing(fetchedDrawing, drawingDetails.title)
                    }
                  >
                    <div>Download</div>
                    <DownloadIcon color={"#FFF"} />
                  </button>
                )
              ) : null}
            </div>
          )}
        </Card>

        {settings.forPinnedShowcase ? (
          showTempBaselineSkeleton || isFetching ? (
            <div
              style={{ width: "4em", height: "1em" }}
              className={classes.skeletonLoading}
            ></div>
          ) : (
            <div>{drawingDetails.title}</div>
          )
        ) : null}
      </div>
    </div>
  );
};

export default GallaryItem;
