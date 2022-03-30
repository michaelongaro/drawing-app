import { createContext, useEffect, useState } from "react";

import { getDatabase, get, ref, child } from "firebase/database";
import { app } from "../../util/init-firebase";

const SearchContext = createContext(null);

export function SearchProvider(props) {
  const [searchValues, setSearchValues] = useState({
    adjSearch: ["", ""],
    nounSearch: ["", ""],
    autofilledAdjectiveInput: ["", ""],
    autofilledNounInput: ["", ""],
    requestedAdjectives: [[], []],
    requestedNouns: [[], []],
    gallary: [null, null],
  });

  const [persistingUserGallary, setPersistingUserGallary] = useState([]);

  function updateSearchValues(key, value, idx) {
    let tempValues = { ...searchValues };
    let newValue = tempValues[key];
    newValue[idx] = value;

    tempValues[key] = newValue;
    setSearchValues(tempValues);
  }

  function resetAllValues(idx) {
    updateSearchValues("adjSearch", "", idx);
    updateSearchValues("nounSearch", "", idx);
    updateSearchValues("autofilledAdjectiveInput", "", idx);
    updateSearchValues("autofilledNounInput", "", idx);
    updateSearchValues("requestedAdjectives", [], idx);
    updateSearchValues("requestedNouns", [], idx);
    updateSearchValues("gallary", null, idx);
  }

  function getGallary(profile = "") {
    let idx = profile.length > 0 ? 1 : 0;
    let fetchAll = false;
    if (
      searchValues["adjSearch"][idx] === "" &&
      searchValues["nounSearch"][idx] === ""
    ) {
      if (idx === 1) {
        fetchAll = true;
      } else {
        return;
      }
    }

    let fullQuery = `${searchValues["adjSearch"][idx]} ${searchValues["nounSearch"][idx]}`;
    let gallaryResults = { 60: [], 180: [], 300: [] };
    const drawingIDS = [];
    const promises = [];
    const dbRef = ref(getDatabase(app));
    console.log(`${profile}titles`);
    get(child(dbRef, `${profile}titles`))
      .then((snapshot) => {
        console.log(snapshot.val());
        for (const index in Object.values(snapshot.val())) {
          let durationObj = Object.values(snapshot.val());
          for (const title of Object.keys(durationObj[index])) {
            if (title === fullQuery || fetchAll) {
              for (let drawingID of durationObj[index][title]["drawingID"]) {
                drawingIDS.push(drawingID);
              }
            }
          }
        }

        for (const id of drawingIDS) {
          promises.push(get(child(dbRef, `drawings/${id}`)));
        }

        return Promise.all(promises);
      })
      .then((results) => {
        if (results.length === 0) {
          updateSearchValues("gallary", "none", idx);
        } else {
          for (const result of results) {
            gallaryResults[result.val()["seconds"]].push(result.val());
          }

          updateSearchValues("gallary", gallaryResults, idx);
          setPersistingUserGallary(gallaryResults);
        }
      });
  }

  const context = {
    // adjSearch: adjSearch,
    // nounSearch: nounSearch,
    // requestedAdjectives: requestedAdjectives,
    // requestedNouns: requestedNouns,
    // gallary: gallary,
    // autofilledAdjectiveInput: autofilledAdjectiveInput,
    // autofilledNounInput: autofilledNounInput,
    // setAutofilledAdjectiveInput: setAutofilledAdjectiveInput,
    // setAutofilledNounInput: setAutofilledNounInput,
    // setAdjSearch: setAdjSearch,
    // setNounSearch: setNounSearch,
    // setRequestedAdjectives: setRequestedAdjectives,
    // setRequestedNouns: setRequestedNouns,
    // setGallary: setGallary,
    searchValues: searchValues,
    persistingUserGallary: persistingUserGallary,
    setPersistingUserGallary: setPersistingUserGallary,
    updateSearchValues: updateSearchValues,
    resetAllValues: resetAllValues,
    getGallary: getGallary,
  };

  return (
    <SearchContext.Provider value={context}>
      {props.children}
    </SearchContext.Provider>
  );
}

export default SearchContext;
