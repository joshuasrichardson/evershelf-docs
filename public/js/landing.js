(function () {
  "use strict";

  var STORAGE_KEY = "evershelf-public-planner-v2";
  var planner = document.querySelector("[data-planner]");
  if (!planner) return;

  var apiBase = (document.body.getAttribute("data-api-base") || "").replace(/\/$/, "");
  var form = document.getElementById("planner-form");
  var steps = Array.prototype.slice.call(document.querySelectorAll("[data-step]"));
  var nextButton = document.querySelector("[data-next]");
  var backButton = document.querySelector("[data-back]");
  var skipButton = document.querySelector("[data-skip-step]");
  var stepCount = document.querySelector("[data-step-count]");
  var progressBar = document.querySelector("[data-progress-bar]");
  var formError = document.querySelector("[data-form-error]");
  var loading = document.querySelector("[data-loading]");
  var teaser = document.querySelector("[data-teaser]");
  var fullPlan = document.querySelector("[data-full-plan]");
  var appCTA = document.querySelector("[data-app-cta]");
  var avoidanceInput = document.querySelector("[data-avoidance-input]");
  var avoidanceTags = document.querySelector("[data-avoidance-tags]");
  var activePlan = null;
  var activePreview = null;

  var ratingSections = {
    grains_proteins: [
      { title: "Grains", items: [["white_rice","White rice"],["brown_rice","Brown rice"],["rolled_oats","Rolled oats"],["instant_oats","Instant oats"],["pasta","Pasta"],["flour","Flour"],["wheat_berries","Wheat berries"],["cornmeal","Cornmeal"],["pancake_mix","Pancake mix"],["crackers","Crackers"],["breakfast_cereal","Breakfast cereal"]] },
      { title: "Proteins", items: [["canned_chicken","Canned chicken"],["tuna","Tuna"],["salmon","Salmon"],["spam","Spam"],["peanut_butter","Peanut butter"],["beans","Beans"],["lentils","Lentils"],["freeze_dried_meat","Freeze-dried meat"],["beef_stew","Beef stew"],["chili","Chili"],["protein_powder","Protein powder"]] }
    ],
    produce_dairy: [
      { title: "Fruits", items: [["canned_peaches","Canned peaches"],["pears","Pears"],["pineapple","Pineapple"],["fruit_cocktail","Fruit cocktail"],["applesauce","Applesauce"],["raisins","Raisins"],["dried_cranberries","Dried cranberries"],["freeze_dried_strawberries","Freeze-dried strawberries"],["freeze_dried_blueberries","Freeze-dried blueberries"],["banana_chips","Banana chips"]] },
      { title: "Vegetables", items: [["green_beans","Green beans"],["corn","Corn"],["peas","Peas"],["carrots","Carrots"],["mixed_vegetables","Mixed vegetables"],["potatoes","Potatoes"],["tomatoes","Tomatoes"],["tomato_sauce","Tomato sauce"],["freeze_dried_vegetables","Freeze-dried vegetables"]] },
      { title: "Dairy", items: [["powdered_milk","Powdered milk"],["shelf_stable_milk","Shelf-stable milk"],["evaporated_milk","Evaporated milk"],["powdered_cheese","Powdered cheese"],["butter_powder","Butter powder"]] }
    ],
    snacks_baking: [
      { title: "Snacks and comfort", items: [["granola_bars","Granola bars"],["pretzels","Pretzels"],["popcorn","Popcorn"],["chocolate","Chocolate"],["fruit_snacks","Fruit snacks"],["nuts","Nuts"]] },
      { title: "Baking", items: [["sugar","Sugar"],["brown_sugar","Brown sugar"],["yeast","Yeast"],["baking_powder","Baking powder"],["baking_soda","Baking soda"],["cocoa","Cocoa"],["vanilla","Vanilla"]] }
    ]
  };

  var triDefinitions = {
    dependent: [
      ["pregnant", "Pregnancy in the household"],
      ["formula_needed", "Infant formula is currently used"]
    ],
    functional: [
      ["accessibility_needs", "Access or functional support needs"],
      ["refrigerated_medical", "Medical supplies require refrigeration"],
      ["backup_power_dependency", "Essential equipment depends on power"]
    ]
  };

  var cookingMethods = [["normal_kitchen","Normal kitchen"],["propane_stove","Propane stove"],["camp_stove","Camp stove"],["dutch_oven","Dutch oven"],["solar_oven","Solar oven"]];
  var fuelFields = ["fuel_propane_1lb","fuel_propane_20lb","fuel_butane_canisters","fuel_other_sessions"];
  var state = loadDraft();

  function startingFoodRatings() {
    var ratings = {};
    Object.keys(ratingSections).forEach(function (sectionName) {
      ratingSections[sectionName].forEach(function (group) {
        group.items.forEach(function (item) { ratings[item[0]] = 3; });
      });
    });
    return ratings;
  }

  function emptyState() {
    return {
      step: 0,
      answers: {
        household_size: 2, adults: 2, children: 0, infants: 0,
        evacuation_target_days: 3, extended_target_days: 90,
        pantry_style: "mixed", food_ratings: startingFoodRatings()
      },
      answered: ["household_size","adults","children","infants","evacuation_target_days","extended_target_days","pantry_style","food_ratings"],
      foodAvoidances: []
    };
  }

  function loadDraft() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== 2 || !saved.data) return emptyState();
      saved.data.step = Math.max(0, Math.min(steps.length - 1, Number(saved.data.step) || 0));
      saved.data.answers = saved.data.answers || {};
      saved.data.answered = saved.data.answered || [];
      saved.data.foodAvoidances = saved.data.foodAvoidances || [];
      return saved.data;
    } catch (_) {
      return emptyState();
    }
  }

  function saveDraft() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, data: state })); } catch (_) {}
  }

  function markAnswered(name) {
    if (state.answered.indexOf(name) === -1) state.answered.push(name);
  }

  function unmarkAnswered(name) {
    state.answered = state.answered.filter(function (value) { return value !== name; });
  }

  function escapeText(value) {
    return String(value == null ? "" : value);
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderRatings() {
    Object.keys(ratingSections).forEach(function (sectionName) {
      var host = document.querySelector('[data-rating-section="' + sectionName + '"]');
      if (!host) return;
      host.innerHTML = "";
      ratingSections[sectionName].forEach(function (group) {
        var wrapper = element("div", "rating-group");
        wrapper.appendChild(element("h4", "", group.title));
        var list = element("div", "rating-list");
        group.items.forEach(function (item) {
          var row = element("div", "rating-row");
          row.appendChild(element("span", "rating-food-name", item[1]));
          var options = element("div", "rating-options");
          options.setAttribute("role", "group");
          options.setAttribute("aria-label", "Rate " + item[1] + " from 0 to 5");
          [0,1,2,3,4,5].forEach(function (rating) {
            var button = element("button", "", String(rating));
            button.type = "button";
            button.setAttribute("aria-label", item[1] + ": " + rating + " out of 5");
            if (state.answers.food_ratings && state.answers.food_ratings[item[0]] === rating) button.classList.add("is-selected");
            button.addEventListener("click", function () {
              state.answers.food_ratings = state.answers.food_ratings || {};
              state.answers.food_ratings[item[0]] = rating;
              markAnswered("food_ratings");
              Array.prototype.forEach.call(options.querySelectorAll("button"), function (node) { node.classList.remove("is-selected"); });
              button.classList.add("is-selected");
              saveDraft();
            });
            options.appendChild(button);
          });
          row.appendChild(options); list.appendChild(row);
        });
        wrapper.appendChild(list);
        var otherLabel = element("label", "other-foods-field", "Other " + group.title.toLowerCase() + " your household loves or uses regularly");
        var otherInput = document.createElement("input");
        otherInput.type = "text";
        otherInput.placeholder = "Add foods separated by commas";
        otherInput.setAttribute("data-other-foods", group.title.toLowerCase().replace(/[^a-z]+/g, "_"));
        var favorites = state.answers.food_group_favorites || {};
        otherInput.value = (favorites[otherInput.getAttribute("data-other-foods")] || []).join(", ");
        otherInput.addEventListener("input", function () {
          var key = otherInput.getAttribute("data-other-foods");
          state.answers.food_group_favorites = state.answers.food_group_favorites || {};
          var values = otherInput.value.split(",").map(function (value) { return value.trim(); }).filter(Boolean).slice(0, 20);
          if (values.length) state.answers.food_group_favorites[key] = values;
          else delete state.answers.food_group_favorites[key];
          if (Object.keys(state.answers.food_group_favorites).length) markAnswered("food_group_favorites");
          else { delete state.answers.food_group_favorites; unmarkAnswered("food_group_favorites"); }
          saveDraft();
        });
        otherLabel.appendChild(otherInput); wrapper.appendChild(otherLabel); host.appendChild(wrapper);
      });
    });
  }

  function renderCookingPreferences() {
    var host = document.querySelector("[data-cooking-preferences]");
    if (!host) return;
    host.innerHTML = "";
    cookingMethods.forEach(function (method) {
      var row = element("div", "method-preference-row");
      row.appendChild(element("strong", "", method[1]));
      var options = element("div", "method-preference-options");
      options.setAttribute("role", "group");
      options.setAttribute("aria-label", method[1] + " preference");
      [["already_have","Already have"],["want","Want"],["dont_want","Don’t want"]].forEach(function (option) {
        var button = element("button", "", option[1]); button.type = "button";
        if (state.answers.cooking_method_preferences && state.answers.cooking_method_preferences[method[0]] === option[0]) button.classList.add("is-selected");
        button.addEventListener("click", function () {
          state.answers.cooking_method_preferences = state.answers.cooking_method_preferences || {};
          state.answers.cooking_method_preferences[method[0]] = option[0];
          markAnswered("cooking_method_preferences");
          Array.prototype.forEach.call(options.querySelectorAll("button"), function (node) { node.classList.remove("is-selected"); });
          button.classList.add("is-selected"); saveDraft();
        });
        options.appendChild(button);
      });
      row.appendChild(options); host.appendChild(row);
    });
  }

  function estimatedFuelDays() {
    var a = state.answers;
	var sessions = Number(a.fuel_other_sessions) || 0;
    return sessions > 0 ? Math.ceil(sessions / 2) : 0;
  }

  function updateFuelEstimate() {
    var host = document.querySelector("[data-fuel-estimate]");
    if (!host) return;
    var days = estimatedFuelDays();
    host.textContent = days > 0
      ? "Tested-session planning coverage: about " + days + " day" + (days === 1 ? "" : "s") + ". Retest with the exact appliance and keep a reserve."
      : "Cylinder counts are recorded, but no tested cooking sessions receive coverage credit yet.";
  }

  function makeTriQuestion(name, labelText) {
    var wrapper = element("div", "tri-question");
    wrapper.appendChild(element("span", "", labelText));
    var options = element("div", "tri-options");
    [["true","Yes"],["false","No"],["prefer","Prefer not to answer"]].forEach(function (data) {
      var button = element("button", "", data[1]); button.type = "button"; button.setAttribute("data-tri-value", data[0]);
      if ((data[0] === "prefer" && state.answers[name] == null && state.answered.indexOf(name) !== -1) || String(state.answers[name]) === data[0]) button.classList.add("is-selected");
      button.addEventListener("click", function () {
        Array.prototype.forEach.call(options.querySelectorAll("button"), function (node) { node.classList.remove("is-selected"); });
        button.classList.add("is-selected"); markAnswered(name);
        if (data[0] === "prefer") delete state.answers[name]; else state.answers[name] = data[0] === "true";
        saveDraft();
      });
      options.appendChild(button);
    });
    wrapper.appendChild(options); return wrapper;
  }

  function renderTriStates() {
    Object.keys(triDefinitions).forEach(function (groupName) {
      var host = document.querySelector('[data-tristates="' + groupName + '"]');
      if (!host) return;
      host.innerHTML = "";
      triDefinitions[groupName].forEach(function (definition) { host.appendChild(makeTriQuestion(definition[0], definition[1])); });
    });
    var noCookHost = document.querySelector('[data-tristate="no_cook_preferred"]');
    if (noCookHost) { noCookHost.innerHTML = ""; noCookHost.appendChild(makeTriQuestion("no_cook_preferred", "No-cook preference")); }
  }

  function addAvoidances(raw) {
    raw.split(",").forEach(function (part) {
      var value = part.trim().replace(/[.;:]+$/, "");
      if (!value || value.length > 80) return;
      var exists = state.foodAvoidances.some(function (current) { return current.toLowerCase() === value.toLowerCase(); });
      if (!exists && state.foodAvoidances.length < 20) state.foodAvoidances.push(value);
    });
    markAnswered("food_avoidances");
    renderAvoidances(); saveDraft();
  }

  function renderAvoidances() {
    avoidanceTags.innerHTML = "";
    state.foodAvoidances.forEach(function (value, index) {
      var tag = element("span", "food-tag", value);
      var remove = element("button", "", "×"); remove.type = "button"; remove.setAttribute("aria-label", "Remove " + value);
      remove.addEventListener("click", function () { state.foodAvoidances.splice(index, 1); renderAvoidances(); saveDraft(); });
      tag.appendChild(remove); avoidanceTags.appendChild(tag);
    });
  }

  function syncInputsFromState() {
    Array.prototype.forEach.call(form.querySelectorAll("input[name], select[name]"), function (input) {
      if (input.type === "checkbox") return;
      var name = input.name;
      if (name === "custom_budget") {
        input.value = state.answered.indexOf("monthly_budget_cents") !== -1 && state.answers.monthly_budget_cents != null ? String(state.answers.monthly_budget_cents / 100) : "";
      } else if (state.answers[name] != null) input.value = state.answers[name];
      else input.value = "";
    });
  }

  function bindInputs() {
    Array.prototype.forEach.call(form.querySelectorAll("input[name], select[name]"), function (input) {
      if (input.type === "checkbox") return;
      input.addEventListener("input", function () {
        var name = input.name;
        if (name === "custom_budget") name = "monthly_budget_cents";
        if (input.value === "") { delete state.answers[name]; unmarkAnswered(name); if (fuelFields.indexOf(name) !== -1) updateFuelEstimate(); saveDraft(); return; }
        markAnswered(name);
        if (name === "monthly_budget_cents") {
          state.answers[name] = Math.round(Number(input.value) * 100);
          clearSingleVisual("monthly_budget_cents");
        } else if (input.type === "number") state.answers[name] = Number(input.value);
        else state.answers[name] = input.value;
        if (fuelFields.indexOf(name) !== -1) updateFuelEstimate();
        saveDraft();
      });
    });
  }

  function clearSingleVisual(name) {
    var host = document.querySelector('[data-single="' + name + '"]');
    if (host) Array.prototype.forEach.call(host.querySelectorAll("button"), function (button) { button.classList.remove("is-selected"); });
  }

  function bindChoices() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-single]"), function (host) {
      var name = host.getAttribute("data-single");
      Array.prototype.forEach.call(host.querySelectorAll("[data-value]"), function (button) {
        if (String(state.answers[name]) === button.getAttribute("data-value")) button.classList.add("is-selected");
        button.addEventListener("click", function () {
          Array.prototype.forEach.call(host.querySelectorAll("button"), function (node) { node.classList.remove("is-selected"); });
          button.classList.add("is-selected");
          var raw = button.getAttribute("data-value"); state.answers[name] = name === "monthly_budget_cents" ? Number(raw) : raw; markAnswered(name);
          if (name === "monthly_budget_cents") { var custom = form.querySelector('[name="custom_budget"]'); if (custom) custom.value = ""; }
          saveDraft();
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-multi]"), function (host) {
      var name = host.getAttribute("data-multi"); var limit = Number(host.getAttribute("data-limit")) || Infinity;
      var selected = state.answers[name] || [];
      Array.prototype.forEach.call(host.querySelectorAll("[data-value]"), function (button) {
        var value = button.getAttribute("data-value"); if (selected.indexOf(value) !== -1) button.classList.add("is-selected");
        button.addEventListener("click", function () {
          var values = (state.answers[name] || []).slice(); var index = values.indexOf(value);
          if (index !== -1) values.splice(index, 1); else { if (values.length >= limit) values.shift(); values.push(value); }
          state.answers[name] = values; markAnswered(name);
          Array.prototype.forEach.call(host.querySelectorAll("[data-value]"), function (node) { node.classList.toggle("is-selected", values.indexOf(node.getAttribute("data-value")) !== -1); });
          saveDraft();
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-none]"), function (button) {
      button.addEventListener("click", function () {
        var name = button.getAttribute("data-none"); markAnswered(name);
        if (name === "food_avoidances") { state.foodAvoidances = []; renderAvoidances(); }
        else {
          state.answers[name] = [];
          var host = document.querySelector('[data-multi="' + name + '"]');
          if (host) Array.prototype.forEach.call(host.querySelectorAll("button"), function (node) { node.classList.remove("is-selected"); });
          if (name === "cooking_methods") {
            state.answers.no_cook_preferred = true;
            markAnswered("no_cook_preferred");
          }
        }
        saveDraft();
      });
    });
  }

  function officialHazardMap(latitude, longitude) {
    var inUtah = latitude >= 36.9 && latitude <= 42.1 && longitude >= -114.1 && longitude <= -108.9;
    return inUtah
      ? { name: "Be Ready Utah’s official interactive hazard maps", url: "https://beready.utah.gov/utah-hazards/" }
      : { name: "FEMA’s National Risk Index", url: "https://hazards.fema.gov/nri/map" };
  }

  function bindLocationSuggestions() {
    var button = document.querySelector("[data-use-location]");
    var status = document.querySelector("[data-location-status]");
    if (!button || !status) return;
    button.addEventListener("click", function () {
      if (!navigator.geolocation) { status.textContent = "Location sharing isn’t available in this browser. You can still select hazards manually."; return; }
      button.disabled = true; status.textContent = "Requesting your approximate location…";
      navigator.geolocation.getCurrentPosition(function (position) {
        var map = officialHazardMap(position.coords.latitude, position.coords.longitude);
        status.textContent = "";
        status.appendChild(document.createTextNode("We won’t guess from latitude and longitude. Review "));
        var link = element("a", "", map.name); link.href = map.url; link.target = "_blank"; link.rel = "noopener"; status.appendChild(link);
        status.appendChild(document.createTextNode(", then select the hazards it shows for your address. Your coordinates were not saved or submitted."));
        button.disabled = false;
      }, function () {
        status.textContent = "We couldn’t access your location. You can select hazards manually."; button.disabled = false;
      }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 86400000 });
    });
  }

  function showStep(index) {
    state.step = Math.max(0, Math.min(steps.length - 1, index));
    steps.forEach(function (step, stepIndex) { step.classList.toggle("is-active", stepIndex === state.step); });
    stepCount.textContent = "Step " + (state.step + 1) + " of " + steps.length;
    progressBar.style.width = (((state.step + 1) / steps.length) * 100) + "%";
    backButton.hidden = state.step === 0;
    nextButton.textContent = state.step === steps.length - 1 ? "Preview My Plan" : "Continue";
    formError.hidden = true; saveDraft();
  }

  function validateStep(index) {
    if (index !== 0) return "";
    var a = state.answers;
    var compositionProvided = ["adults","children","infants"].some(function (name) { return a[name] != null; });
    if (compositionProvided && a.household_size != null) {
      var adults = a.adults == null ? a.household_size - (a.children || 0) - (a.infants || 0) : a.adults;
      if (adults < 0 || adults + (a.children || 0) + (a.infants || 0) !== a.household_size) return "The household counts you entered need to add up to the household size.";
    }
    var evacuation = a.evacuation_target_days == null ? 3 : a.evacuation_target_days;
    var longTerm = a.extended_target_days == null ? 90 : a.extended_target_days;
    if (!(evacuation > 0 && longTerm >= evacuation)) return "Your long-term home goal must be at least as long as your evacuation goal.";
    return "";
  }

  function publicAnswers() {
    var result = {};
    state.answered.forEach(function (name) {
      if (name === "food_avoidances") result.food_avoidances = state.foodAvoidances.slice();
      else if (fuelFields.indexOf(name) === -1 && Object.prototype.hasOwnProperty.call(state.answers, name)) result[name] = state.answers[name];
    });
    if (result.evacuation_target_days != null || result.extended_target_days != null) {
      var evacuation = result.evacuation_target_days == null ? 3 : result.evacuation_target_days;
      var longTerm = result.extended_target_days == null ? 90 : result.extended_target_days;
      result.stay_home_target_days = Math.max(evacuation, Math.min(14, longTerm));
      result.pantry_target_days = Math.max(result.stay_home_target_days, Math.min(30, longTerm));
    }
    var fuelInventory = {};
    fuelFields.forEach(function (name) { if (state.answered.indexOf(name) !== -1 && state.answers[name] != null) fuelInventory[name] = state.answers[name]; });
    if (Object.keys(fuelInventory).length) {
      result.cooking_fuel_inventory = fuelInventory;
      result.fuel_estimate_needs_review = true;
    }
    if (result.cooking_method_preferences) {
      var usable = Object.keys(result.cooking_method_preferences).filter(function (name) { return result.cooking_method_preferences[name] === "already_have"; });
      var allRejected = Object.keys(result.cooking_method_preferences).length === cookingMethods.length && usable.length === 0;
      if (usable.length || allRejected) result.cooking_methods = usable;
      if (allRejected) result.no_cook_preferred = true;
    }
    return result;
  }

  function apiError(payload, fallback) { return payload && payload.error ? payload.error : fallback; }

  function track(eventName) {
    if (!apiBase) return;
    var body = JSON.stringify({ event: eventName, page: "preparedness_planner", occurred_at: new Date().toISOString() });
    if (navigator.sendBeacon) navigator.sendBeacon(apiBase + "/api/v1/early-access/funnel", new Blob([body], { type: "application/json" }));
    else fetch(apiBase + "/api/v1/early-access/funnel", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function () {});
  }

  function buildPreview() {
    form.hidden = true; teaser.hidden = true; fullPlan.hidden = true; loading.hidden = false; formError.hidden = true;
    track("planner_completed");
    fetch(apiBase + "/api/v1/preparedness/plans/public-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: publicAnswers() }) })
      .then(function (response) { return response.json().catch(function () { return {}; }).then(function (payload) { if (!response.ok) throw new Error(apiError(payload, "We couldn’t build the preview.")); return payload; }); })
      .then(function (preview) { activePreview = preview; activePlan = preview.plan; loading.hidden = true; renderTeaser(activePlan); teaser.hidden = false; teaser.scrollIntoView({ behavior: "smooth", block: "start" }); track("waitlist_form_viewed"); })
      .catch(function (error) { loading.hidden = true; form.hidden = false; formError.textContent = error.message; formError.hidden = false; });
  }

  function money(cents) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((cents || 0) / 100); }
  function priceRange(plan) {
    if (plan.estimated_total_low_cents != null && plan.estimated_total_high_cents != null) return money(plan.estimated_total_low_cents) + "–" + money(plan.estimated_total_high_cents);
    return money(plan.estimated_total_cents);
  }

  function renderTeaser(plan) {
    var host = document.querySelector("[data-teaser-content]"); host.innerHTML = "";
    var firstItem = plan.phases && plan.phases[0] && plan.phases[0].items[0];
    [["Milestone path", plan.milestones.map(function (m) { return m.target_days; }).join(" → ") + " days"],["Estimated retail range", priceRange(plan)],["First priority", firstItem ? firstItem.name : "Evacuation essentials"]].forEach(function (item) {
      var card = element("div", "teaser-stat"); card.appendChild(element("span", "", item[0])); card.appendChild(element("strong", "", item[1])); host.appendChild(card);
    });
  }

  function renderFullPlan() {
    var summary = document.querySelector("[data-plan-summary]"); var phases = document.querySelector("[data-plan-phases]"); summary.innerHTML = ""; phases.innerHTML = "";
    var current = activePlan.phases[0];
    var card = element("div", "plan-summary-card");
    [["Monthly planning target", money(activePlan.monthly_budget_cents)],["Estimated retail range", priceRange(activePlan)],["Start with", current ? current.title : "Evacuation essentials"]].forEach(function (item) { var cell = element("div"); cell.appendChild(element("span", "", item[0])); cell.appendChild(element("strong", "", item[1])); card.appendChild(cell); });
    summary.appendChild(card);
    if (activePreview.unrecognized_avoidances && activePreview.unrecognized_avoidances.length) summary.appendChild(element("div", "avoidance-notice", "Review product labels for: " + activePreview.unrecognized_avoidances.join(", ") + ". We kept these in the plan as manual checks without guessing why you avoid them."));
    (activePlan.warnings || []).forEach(function (warning) { summary.appendChild(element("div", "avoidance-notice", warning)); });
    if (activePlan.milestones && activePlan.milestones.length) {
      var readiness = element("div", "plan-summary-card");
      activePlan.milestones.forEach(function (milestone) { var cell = element("div"); cell.appendChild(element("span", "", milestone.title)); cell.appendChild(element("strong", "", (milestone.status || "incomplete").replace("_", " ") + " · " + milestone.target_days + " days")); readiness.appendChild(cell); });
      summary.appendChild(readiness);
    }
    activePlan.phases.forEach(function (phase, phaseIndex) {
      var details = element("details", "plan-phase"); if (phaseIndex === 0) details.open = true;
      var phaseSummary = document.createElement("summary"); var titleWrap = element("div"); titleWrap.appendChild(element("span", "phase-kicker", "Phase " + phase.sequence)); titleWrap.appendChild(element("span", "phase-title", phase.title)); phaseSummary.appendChild(titleWrap); phaseSummary.appendChild(element("span", "phase-cost", money(phase.estimated_purchase_cents) + " estimated")); details.appendChild(phaseSummary);
      var items = element("div", "phase-items");
      phase.items.forEach(function (item) {
        var itemCard = element("article", "plan-item"); var top = element("div", "item-top"); top.appendChild(element("span", "item-name", item.name)); top.appendChild(element("span", "item-category", item.category)); itemCard.appendChild(top);
        itemCard.appendChild(element("p", "item-meta", Number(item.remaining_quantity).toLocaleString() + " " + item.unit + " · " + money(item.estimated_remaining_cents)));
        if (item.price_estimate) itemCard.appendChild(element("p", "item-meta", money(item.price_estimate.low_cents) + "–" + money(item.price_estimate.high_cents) + " per package · " + item.price_estimate.confidence + " confidence · " + item.price_estimate.region + " · " + item.price_estimate.as_of));
        itemCard.appendChild(element("p", "item-rationale", item.rationale));
        if (item.bundle_components && item.bundle_components.length) {
          var componentList = element("ul", "item-components");
          item.bundle_components.forEach(function (component) {
            componentList.appendChild(element("li", "", component.quantity + "× " + component.name + " · " + money(component.unit_cost_cents) + " seed estimate"));
          });
          itemCard.appendChild(componentList);
        }
        if (item.review_status === "needs_review") itemCard.appendChild(element("p", "item-safety", "Choose an exact product and verify its current label, package data, and price before treating this recommendation as complete."));
        if (item.safety_notice) itemCard.appendChild(element("p", "item-safety", item.safety_notice));
        if (item.source_refs && item.source_refs.length) { var sourceHost = element("div", "source-links"); item.source_refs.forEach(function (source) { var link = element("a", "", source.organization + ": " + source.title); link.href = source.url; link.target = "_blank"; link.rel = "noopener"; sourceHost.appendChild(link); }); itemCard.appendChild(sourceHost); }
        items.appendChild(itemCard);
      });
      details.appendChild(items); phases.appendChild(details);
    });
    if (activePlan.nutrition_coverage || activePlan.preparation_coverage) {
      var proofDetails = element("details", "plan-phase"); proofDetails.open = true;
      var proofSummary = document.createElement("summary"); proofSummary.appendChild(element("span", "phase-title", "Nutrition and preparation proof")); proofDetails.appendChild(proofSummary);
      if (activePlan.nutrition_coverage) proofDetails.appendChild(element("p", "item-rationale", activePlan.nutrition_coverage.target_days + "-day nutrition projection: " + activePlan.nutrition_coverage.projected_status.replace("_", " ") + ". Calories, protein, fat, five food groups, and vitamin C must all reach their targets."));
      if (activePlan.preparation_coverage) {
        proofDetails.appendChild(element("p", "item-rationale", "Planned cooked packages: " + Number(activePlan.preparation_coverage.planned_cooked_packages).toLocaleString() + " · cooking water allocated: " + Number(activePlan.preparation_coverage.cooking_water_liters).toLocaleString() + " L · fuel: " + activePlan.preparation_coverage.fuel_status.replace("_", " ")));
        (activePlan.preparation_coverage.unresolved_dependencies || []).forEach(function (gap) { proofDetails.appendChild(element("p", "item-meta", gap)); });
      }
      phases.appendChild(proofDetails);
    }
    if (activePlan.requirements && activePlan.requirements.length) {
      var requirementDetails = element("details", "plan-phase"); requirementDetails.open = true;
      var requirementSummary = document.createElement("summary"); requirementSummary.appendChild(element("span", "phase-title", "What completion actually requires")); requirementDetails.appendChild(requirementSummary);
      var requirementItems = element("div", "phase-items");
      activePlan.requirements.forEach(function (requirement) { var requirementCard = element("article", "plan-item"); var requirementTop = element("div", "item-top"); requirementTop.appendChild(element("span", "item-name", requirement.title)); requirementTop.appendChild(element("span", "item-category", requirement.status.replace("_", " "))); requirementCard.appendChild(requirementTop); requirementCard.appendChild(element("p", "item-meta", Number(requirement.credited).toLocaleString() + " of " + Number(requirement.target).toLocaleString() + " " + requirement.unit + " verified · " + requirement.confidence + " confidence")); requirementCard.appendChild(element("p", "item-rationale", requirement.quantity_derivation)); requirementItems.appendChild(requirementCard); });
      requirementDetails.appendChild(requirementItems); phases.appendChild(requirementDetails);
    }
    if (activePlan.actions && activePlan.actions.length) {
      var actionDetails = element("details", "plan-phase"); var actionSummary = document.createElement("summary"); actionSummary.appendChild(element("span", "phase-title", "Planning and practice—not merchandise")); actionDetails.appendChild(actionSummary);
      var actionItems = element("div", "phase-items"); activePlan.actions.forEach(function (action) { var actionCard = element("article", "plan-item"); var actionTop = element("div", "item-top"); actionTop.appendChild(element("span", "item-name", action.title)); actionTop.appendChild(element("span", "item-category", action.category)); actionCard.appendChild(actionTop); actionCard.appendChild(element("p", "item-rationale", action.detail)); actionItems.appendChild(actionCard); }); actionDetails.appendChild(actionItems); phases.appendChild(actionDetails);
    }
  }

  function attribution() {
    var params = new URLSearchParams(window.location.search); var result = { referrer: document.referrer || "" };
    ["source","medium","campaign","term","content"].forEach(function (key) { var value = params.get("utm_" + key); if (value) result[key] = value; });
    return result;
  }

  document.getElementById("waitlist-form").addEventListener("submit", function (event) {
    event.preventDefault(); var waitlistForm = event.currentTarget; var errorBox = document.querySelector("[data-waitlist-error]"); errorBox.hidden = true;
    if (!waitlistForm.checkValidity()) { waitlistForm.reportValidity(); return; }
    var submit = waitlistForm.querySelector('button[type="submit"]'); submit.disabled = true; submit.textContent = "Joining…";
    var data = new FormData(waitlistForm);
    fetch(apiBase + "/api/v1/early-access/fulfillment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ first_name: data.get("first_name"), email: data.get("email"), postal_code: data.get("postal_code") || "", consent: data.get("consent") === "on", research_consent: data.get("research_consent") === "on", answers: publicAnswers(), attribution: attribution() }) })
      .then(function (response) { return response.json().catch(function () { return {}; }).then(function (payload) { if (!response.ok) throw new Error(apiError(payload, "We couldn’t join the waitlist.")); return payload; }); })
      .then(function () { teaser.hidden = true; renderFullPlan(); fullPlan.hidden = false; appCTA.hidden = false; fullPlan.scrollIntoView({ behavior: "smooth", block: "start" }); track("waitlist_submitted"); track("full_plan_viewed"); localStorage.removeItem(STORAGE_KEY); })
      .catch(function (error) { errorBox.textContent = error.message; errorBox.hidden = false; submit.disabled = false; submit.textContent = "Join Early Access & See My Plan"; });
  });

  nextButton.addEventListener("click", function () { var error = validateStep(state.step); if (error) { formError.textContent = error; formError.hidden = false; return; } if (state.step === steps.length - 1) buildPreview(); else showStep(state.step + 1); });
  backButton.addEventListener("click", function () { showStep(state.step - 1); });
  skipButton.addEventListener("click", function () { if (state.step === steps.length - 1) buildPreview(); else showStep(state.step + 1); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-skip-all]"), function (button) { button.addEventListener("click", function () { state = emptyState(); saveDraft(); track("planner_skipped"); document.getElementById("planner").scrollIntoView({ behavior: "smooth" }); buildPreview(); }); });
  document.querySelector("[data-reset]").addEventListener("click", function () { if (!window.confirm("Clear all planner answers and start over?")) return; localStorage.removeItem(STORAGE_KEY); window.location.reload(); });
  document.querySelector("[data-start-over]").addEventListener("click", function () { localStorage.removeItem(STORAGE_KEY); window.location.reload(); });
  document.querySelector("[data-app-store]").addEventListener("click", function () { track("app_store_clicked"); });

  avoidanceInput.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addAvoidances(avoidanceInput.value); avoidanceInput.value = ""; } });
  avoidanceInput.addEventListener("input", function () { if (avoidanceInput.value.indexOf(",") !== -1) { var parts = avoidanceInput.value.split(","); addAvoidances(parts.slice(0,-1).join(",")); avoidanceInput.value = parts[parts.length - 1]; } });
  avoidanceInput.addEventListener("blur", function () { if (avoidanceInput.value.trim()) { addAvoidances(avoidanceInput.value); avoidanceInput.value = ""; } });

  var query = new URLSearchParams(window.location.search); var status = query.get("waitlist");
  if (status === "confirmed" || status === "unsubscribed") { var toast = document.querySelector("[data-status-toast]"); toast.textContent = status === "confirmed" ? "Your early-access email is confirmed. Thank you!" : "You have been unsubscribed from EverShelf updates."; toast.hidden = false; window.setTimeout(function () { toast.hidden = true; }, 7000); if (status === "confirmed") track("email_confirmed"); }
  if (query.get("research") === "withdrawn") { var researchToast = document.querySelector("[data-status-toast]"); researchToast.textContent = "Your optional research response has been deleted."; researchToast.hidden = false; window.setTimeout(function () { researchToast.hidden = true; }, 7000); }

  renderRatings(); renderCookingPreferences(); renderTriStates(); syncInputsFromState(); bindInputs(); bindChoices(); bindLocationSuggestions(); renderAvoidances(); updateFuelEstimate(); showStep(state.step); track("planner_started");
  window.__everShelfPlanner = { publicAnswers: publicAnswers, estimatedFuelDays: estimatedFuelDays, officialHazardMap: officialHazardMap, researchAvoidanceSummary: function () { return state.foodAvoidances.slice(); } };
})();
