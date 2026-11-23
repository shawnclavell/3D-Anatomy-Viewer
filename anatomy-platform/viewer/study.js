(function () {
  "use strict";
  var status = document.getElementById("guideStatus");
  var content = document.getElementById("guideContent");
  var search = document.getElementById("guideSearch");
  function element(tag, text, parent) {
    var item = document.createElement(tag);
    item.textContent = text;
    if (parent) parent.appendChild(item);
    return item;
  }
  var route = new URLSearchParams(window.location.search).get("model") || "skull-base";
  if (route !== "skull-base") { status.textContent = "A text guide is currently available for skull base only. Use the skull-base viewer link above."; return; }
  fetch("models/skull-base.study.json", {cache:"no-store"}).then(function (response) {
    if (!response.ok) throw new Error("Guide unavailable");
    return response.json();
  }).then(function (guide) {
    document.title = guide.title;
    document.getElementById("guideTitle").textContent = guide.title;
    status.textContent = guide.reviewStatus;
    element("p", guide.scope, content);
    element("h2", "Orientation", content);
    guide.orientation.forEach(function (text) { element("p", text, content); });
    element("h2", "Study goals", content);
    var goals = element("ul", "", content);
    guide.objectives.forEach(function (text) { element("li", text, goals); });
    element("h2", "Landmark descriptions", content);
    var entries = element("section", "", content);
    entries.setAttribute("aria-label", "Landmark descriptions");
    guide.entries.forEach(function (entry) {
      var article = element("article", "", entries);
      element("h3", entry.title, article);
      var fields = element("dl", "", article);
      [["Bone",entry.bone],["Location",entry.location],["Relationships",entry.relationships],["Why it matters",entry.significance],["Source section",entry.sourceSection]].forEach(function (field) {
        element("dt", field[0], fields); element("dd", field[1], fields);
      });
    });
    function filter() {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      Array.prototype.forEach.call(entries.children, function (article) {
        article.hidden = article.textContent.toLowerCase().indexOf(q) === -1;
        if (!article.hidden) shown++;
      });
      document.getElementById("guideCount").textContent = shown + " of " + guide.entries.length + " landmark groups shown. Orientation, practice and sources remain available below.";
    }
    search.addEventListener("input", filter);
    filter();
    element("h2", "Practice relationships", content);
    guide.practice.forEach(function (practice) {
      var detail = element("details", "", content);
      element("summary", practice.question, detail);
      element("p", practice.answer, detail);
    });
    element("h2", "Sources and reuse", content);
    guide.sources.forEach(function (source) {
      var p = element("p", "", content);
      var link = element("a", source.title, p); link.href = source.url;
    });
    element("p", guide.attribution, content);
    var attribution = element("p", "", content);
    var access = element("a", "Access for free at OpenStax", attribution); access.href = guide.accessUrl;
    var license = element("p", "", content);
    var licenseLink = element("a", "Text guide license: CC BY-NC-SA 4.0", license); licenseLink.href = guide.licenseUrl;
    document.getElementById("guideActions").hidden = false;
    document.getElementById("downloadGuide").addEventListener("click", function () {
      var lines = [guide.title,guide.reviewStatus,guide.scope,"","ORIENTATION"].concat(guide.orientation, ["","STUDY GOALS"], guide.objectives);
      guide.entries.forEach(function (entry) { lines.push("",entry.title,"Bone: " + entry.bone,"Location: " + entry.location,"Relationships: " + entry.relationships,"Why it matters: " + entry.significance,"Source section: " + entry.sourceSection); });
      guide.practice.forEach(function (p) { lines.push("","Practice: " + p.question,"Answer: " + p.answer); });
      lines.push("",guide.attribution,guide.accessUrl,guide.licenseUrl);
      guide.sources.forEach(function (s) { lines.push(s.title,s.url); });
      var url = URL.createObjectURL(new Blob([lines.join("\n")+"\n"],{type:"text/plain;charset=utf-8"}));
      var link = document.createElement("a"); link.href=url; link.download="skull-base-text-study.txt"; link.click();
      window.setTimeout(function () { URL.revokeObjectURL(url); },1000);
      status.textContent = "Text guide downloaded. " + guide.reviewStatus;
    });
  }).catch(function () { status.textContent = "The text guide could not be loaded. Reload this page to retry, or use the source chapter linked below."; var link=element("a","OpenStax: The Skull",content);link.href="https://openstax.org/books/anatomy-and-physiology-2e/pages/7-2-the-skull"; });
}());
