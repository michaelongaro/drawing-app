import React from "react";
import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { isEqual } from "lodash";

import ProfilePicture from "./ProfilePicture";
import downloadDrawing from "../../util/downloadDrawing";
import SearchContext from "./SearchContext";
import FavoritesContext from "./FavoritesContext";
import UserModalOpenedContext from "./ModalContext";

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

const DrawingModal = ({
  drawingID = "",
  drawing = "",
  settings = {},
  drawingMetadata = {},
  artistUsername = "",
  idx = -1,
  dbPath = "",
  showDrawingModal = null,
  openedFromUserModal = null,
}) => {
  const location = useLocation();
  const { isLoading, isAuthenticated } = useAuth0();

  const searchCtx = useContext(SearchContext);
  const favoritesCtx = useContext(FavoritesContext);
  const modalCtx = useContext(UserModalOpenedContext);

  const db = getDatabase(app);
  const dbRef = ref(getDatabase(app));
  const storage = getStorage();

  const drawingModalRef = useRef(null);
  const confirmDeleteModalRef = useRef();

  const [fullyFinishedLoading, setFullyFinishedLoading] = useState(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [closeButtonClicked, setCloseButtonClicked] = useState(false);

  const [drawingTotalLikes, setDrawingTotalLikes] = useState(0);
  const [drawingDailyLikes, setDrawingDailyLikes] = useState(0);

  const [imageElementLoaded, setImageElementLoaded] = useState(false);
  const [loadUserModal, setLoadUserModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);

  // user hover states
  const [hoveringOnHeart, setHoveringOnHeart] = useState(false);
  const [hoveringOnImage, setHoveringOnImage] = useState(false);
  const [hoveringOnDeleteButton, setHoveringOnDeleteButton] = useState(false);
  const [hoveringOnLikesTooltip, setHoveringOnLikesTooltip] = useState(false);
  const [hoveringOnProfilePicture, setHoveringOnProfilePicture] =
    useState(false);
  const [hoveringOnUsernameTooltip, setHoveringOnUsernameTooltip] =
    useState(false);

  // states for showing "signup/login" tooltip when clicking like button when unregistered
  const [showTooltip, setShowTooltip] = useState(false);

  const [deletionCheckpointReached, setDeletionCheckpointReached] =
    useState(false);

  useEffect(() => {
    if (
      drawingID !== "" &&
      drawing !== "" &&
      !isEqual(settings, {}) &&
      !isEqual(drawingMetadata, {}) &&
      artistUsername !== "" &&
      idx !== -1 &&
      dbPath !== "" &&
      showDrawingModal !== null &&
      openedFromUserModal !== null
    ) {
      setFullyFinishedLoading(true);
    }
  }, [
    drawingID,
    drawing,
    settings,
    drawingMetadata,
    artistUsername,
    idx,
    dbPath,
    showDrawingModal,
    openedFromUserModal,
  ]);

  useEffect(() => {
    if (!modalCtx.userModalOpened) {
      setShowUserModal(false);
      setLoadUserModal(false);
    }
  }, [modalCtx.userModalOpened]);

  useEffect(() => {
    if (hoveringOnProfilePicture || hoveringOnUsernameTooltip) {
      document.documentElement.style.setProperty("--shimmerPlayState", "true");
    } else {
      document.documentElement.style.setProperty("--shimmerPlayState", "false");
    }
  }, [hoveringOnProfilePicture, hoveringOnUsernameTooltip]);

  useEffect(() => {
    let setTimeoutID;
    if (showTooltip) {
      setTimeoutID = setTimeout(() => setShowTooltip(false), 1250);
    }

    return () => {
      clearTimeout(setTimeoutID);
    };
  }, [showTooltip]);

  useEffect(() => {
    if (deletionCheckpointReached) {
      searchCtx.getGallary(0, 6, 6, idx, dbPath);
      setDeletionCheckpointReached(false);
    }
  }, [dbPath, idx, deletionCheckpointReached]);

  useEffect(() => {
    if (!isEqual(drawingMetadata, {})) {
      onValue(
        ref(
          db,
          `drawingLikes/${drawingMetadata.seconds}/${drawingMetadata.index}`
        ),
        (snapshot) => {
          if (snapshot.exists()) {
            setDrawingTotalLikes(snapshot.val()["totalLikes"]);
            setDrawingDailyLikes(snapshot.val()["dailyLikes"]);
          }
        }
      );
    }
  }, [drawingMetadata]);

  useEffect(() => {
    function modalHandler(event) {
      if (fullyFinishedLoading && !hoveringOnDeleteButton && showDrawingModal) {
        if (showConfirmDeleteModal) {
          if (!confirmDeleteModalRef.current.contains(event.target)) {
            setShowConfirmDeleteModal(false);
          }
          return;
        }

        if (openedFromUserModal) {
          // when drawing modal was opened from user modal
          if (modalCtx.drawingModalFromUserOpened && modalCtx.userModalOpened) {
            if (!drawingModalRef.current.contains(event.target)) {
              modalCtx.setDrawingModalFromUserOpened(false);
            }
          }
        } else if (!openedFromUserModal) {
          // when drawing modal is opened and user modal is closed
          if (modalCtx.drawingModalOpened && !modalCtx.userModalOpened) {
            if (!drawingModalRef.current.contains(event.target)) {
              modalCtx.setDrawingModalOpened(false);
            }
          }
        }
      }
    }

    function escapeHandler(e) {
      if (e.key === "Escape") {
        e.preventDefault();

        // only care about listening to 'esc' when a drawing modal is open
        if (
          modalCtx.drawingModalOpened ||
          modalCtx.drawingModalFromUserOpened
        ) {
          if (openedFromUserModal) {
            modalCtx.setDrawingModalFromUserOpened(false);
          } else if (
            openedFromUserModal === false &&
            !modalCtx.userModalOpened
          ) {
            modalCtx.setDrawingModalOpened(false);
          }
        }
      }
    }

    document.addEventListener("click", modalHandler);
    document.addEventListener("keydown", escapeHandler);

    return () => {
      document.removeEventListener("click", modalHandler);
      document.removeEventListener("keydown", escapeHandler);
    };
  }, [
    fullyFinishedLoading,
    openedFromUserModal,
    modalCtx.drawingModalOpened,
    modalCtx.drawingModalFromUserOpened,
    modalCtx.userModalOpened,
    showConfirmDeleteModal,
    showDrawingModal,
    hoveringOnDeleteButton,
  ]);

  useEffect(() => {
    if (closeButtonClicked) {
      if (openedFromUserModal) {
        modalCtx.setDrawingModalFromUserOpened(false);
      } else if (!openedFromUserModal) {
        modalCtx.setDrawingModalOpened(false);
      }
      setCloseButtonClicked(false);
    }
  }, [closeButtonClicked]);

  function toggleFavoriteStatusHandler() {
    if (
      favoritesCtx.itemIsFavorite(
        drawingID,
        drawingMetadata.seconds,
        drawingMetadata.title
      )
    ) {
      favoritesCtx.removeFavorite(
        drawingID,
        drawingMetadata.seconds,
        drawingMetadata.title,
        drawingTotalLikes - 1,
        drawingDailyLikes - 1
      );
    } else {
      favoritesCtx.addFavorite(
        drawingID,
        drawingMetadata.seconds,
        drawingMetadata.title,
        drawingTotalLikes + 1,
        drawingDailyLikes + 1
      );
    }
  }

  function deleteDrawing() {
    const title = drawingMetadata.title;
    const seconds = drawingMetadata.seconds;
    const uniqueID = drawingMetadata.index;
    const user = drawingMetadata.drawnBy;

    modalCtx.setDrawingModalOpened(false);
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
        // removing the index that has the corresponding drawingID
        drawingIDs.splice(drawingIDs.indexOf(uniqueID), 1);
        if (drawingIDs.length === 0) {
          remove(ref(db, `titles/${seconds}/${title}`));
        } else {
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
            remove(ref(db, `users/${user}/titles/${seconds}/${title}`)).then(
              () => {
                setDeletionCheckpointReached(true);
              }
            );
          } else {
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

  if (!fullyFinishedLoading) {
    return null;
  }

  return (
    <div
      ref={drawingModalRef}
      style={{ width: "75vw" }}
      onMouseEnter={() => {
        setHoveringOnImage(true);
      }}
      onMouseLeave={() => {
        setHoveringOnImage(false);
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
          <div>"{drawingMetadata && drawingMetadata.title}"?</div>

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
        {loadUserModal && <UserModal user={drawingMetadata.drawnBy} />}
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
              display: !imageElementLoaded ? "block" : "none",
              width: "80%", //window.innerWidth / settings.widthRatio,    prob still need exact values here
              height: "80%", //window.innerHeight / settings.heightRatio,
              borderRadius: "1em 1em 0 0",
            }}
            className={classes.skeletonLoading}
          ></div>

          {/* actual image */}
          <div className={classes.glossOver} style={{ position: "relative" }}>
            <img
              style={{
                display: imageElementLoaded ? "block" : "none",
                borderRadius: settings.forPinnedShowcase
                  ? "1em"
                  : "1em 1em 0 0",
                minWidth: "100%",
                minHeight: "100%",
              }}
              src={drawing}
              alt={drawingMetadata?.title ?? "drawing title"}
              onLoad={() => setImageElementLoaded(true)}
            />

            {/* delete drawing button */}
            <button
              className={classes.deleteButton}
              style={{
                display: imageElementLoaded ? "flex" : "none",
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
                top: "1em",
                left: "1em",
              }}
              onMouseEnter={() => {
                setHoveringOnDeleteButton(true);
              }}
              onMouseLeave={() => {
                setHoveringOnDeleteButton(false);
              }}
              onClick={() => {
                setHoveringOnDeleteButton(false);
                setShowConfirmDeleteModal(true);
              }}
            >
              <GarbageIcon dimensions={"1.25em"} />
            </button>

            <div
              style={{
                display: imageElementLoaded ? "flex" : "none",
                top: openedFromUserModal
                  ? modalCtx.drawingModalFromUserOpened
                    ? "1em"
                    : ".5em"
                  : modalCtx.drawingModalOpened
                  ? "1em"
                  : ".5em",
                right: openedFromUserModal
                  ? modalCtx.drawingModalFromUserOpened
                    ? "4.5em"
                    : ".5em"
                  : modalCtx.drawingModalOpened
                  ? "4.5em"
                  : ".5em",
                transition: "all 200ms",
              }}
              className={`${drawingTotalLikes > 0 ? classes.likes : ""}`}
            >
              {drawingTotalLikes > 0 && (
                <div style={{ gap: ".5em" }} className={baseClasses.baseFlex}>
                  <HeartFilledIcon dimensions={"1em"} />{" "}
                  <div>{drawingTotalLikes}</div>
                </div>
              )}
            </div>

            <button
              style={{
                display: imageElementLoaded ? "flex" : "none",
                right: "1em",
              }}
              className={baseClasses.close}
              onClick={() => {
                setCloseButtonClicked(true);
              }}
            ></button>
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
                background: drawingMetadata.hasOwnProperty("averageColor")
                  ? `linear-gradient(
                                        \n
                                        145deg,
                                        \n
                                        rgb(255, 255, 255) 0%,
                                        \n
                                        rgb(${drawingMetadata["averageColor"]["r"]}, 
                                            ${drawingMetadata["averageColor"]["g"]}, 
                                            ${drawingMetadata["averageColor"]["b"]})
                                      )`
                  : "linear-gradient(\n    145deg,\n    rgb(255, 255, 255) 0%,\n    #c2c2c2 125%\n  )",
              }}
              className={classes.bottomContain}
            >
              {/* profile image */}

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
                <ProfilePicture user={drawingMetadata.drawnBy} size="small" />

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
                        hoveringOnProfilePicture || hoveringOnUsernameTooltip
                          ? 1
                          : 0,
                      transform:
                        hoveringOnProfilePicture || hoveringOnUsernameTooltip
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

              {/* ----- drawingID data ----- */}
              {/* title */}
              <div style={{ textAlign: "center" }}>{drawingMetadata.title}</div>

              {/* date */}
              <div>{drawingMetadata.date}</div>

              {/* seconds */}
              {(location.pathname === "/" || modalCtx.drawingModalOpened) && (
                <div style={{ width: "3em", height: "3em" }}>
                  {drawingMetadata.seconds === 60 && (
                    <OneMinuteIcon dimensions={"3em"} />
                  )}
                  {drawingMetadata.seconds === 180 && (
                    <ThreeMinuteIcon dimensions={"3em"} />
                  )}
                  {drawingMetadata.seconds === 300 && (
                    <FiveMinuteIcon dimensions={"3em"} />
                  )}
                </div>
              )}

              {settings.forPinnedItem ? null : (
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
                        drawingMetadata.seconds,
                        drawingMetadata.title
                      ) ? (
                        <HeartBrokenIcon />
                      ) : (
                        <HeartFilledIcon dimensions={"1.5em"} />
                      )
                    ) : favoritesCtx.itemIsFavorite(
                        drawingID,
                        drawingMetadata.seconds,
                        drawingMetadata.title
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

              <CopyToClipboard url={drawing} />

              <button
                style={{ display: "flex", gap: "0.75em", fontSize: "16px" }}
                className={`${baseClasses.activeButton} ${baseClasses.baseFlex}`}
                onClick={() => downloadDrawing(drawing, drawingMetadata.title)}
              >
                <div>Download</div>
                <DownloadIcon color={"#FFF"} />
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DrawingModal;
