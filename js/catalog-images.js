document.querySelectorAll(".product-image[data-universe-id]").forEach((image) => {
  const localProductImages = {
    Gingerscope: "images/mm2/gingerscope.png",
    "Traveler's Axe": "images/mm2/travelers-axe.png",
    Evergun: "images/mm2/evergun.png",
    "Chroma Weapons Set": "images/mm2/chroma-weapons.png",
    Harvester: "images/mm2/harvester.png",
    Icebreaker: "images/mm2/icebreaker.png",
    "PCC Prestige Candy Cane": "images/mm2/pcc.png",
    "CC Candy Cane": "images/mm2/cc.png",
    "World Ender": "images/mm2/world-ender.png",
  };
  const localFallbacks = {
    "2753915549": "images/blox-fruits.png",
    "66654135": "images/mm2.png",
    "1730877806": "images/gpo.png",
  };
  const fallbackUrl = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${image.dataset.universeId}&size=420x420&format=Png&isCircular=false`;
  const catalogKeyword = image.dataset.catalogKeyword ||
    (image.dataset.universeId === "66654135" ? `${image.alt} MM2` : null);
  const catalogUrl = catalogKeyword
    ? `https://catalog.roblox.com/v1/search/items/details?Category=11&Keyword=${encodeURIComponent(catalogKeyword)}&Limit=10&SortType=0`
    : null;
  const localImage = localProductImages[image.alt];
  image.src = localImage || localFallbacks[image.dataset.universeId] || "images/blox-fruits.png";
  if (localImage) return;
  fetch(catalogUrl || fallbackUrl)
    .then((response) => response.json())
    .then((data) => {
      const item = catalogKeyword ? data.data?.find((entry) => entry.name?.toLowerCase().includes(catalogKeyword.toLowerCase().split(" ")[0])) : null;
      if (item?.id) {
        return fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${item.id}&size=420x420&format=Png&isCircular=false`)
          .then((response) => response.json());
      }
      return fetch(fallbackUrl).then((response) => response.json());
    })
    .then((data) => {
      if (data?.data?.[0]?.imageUrl) image.src = data.data[0].imageUrl;
      image.classList.add("is-loaded");
    })
    .catch(() => {
      image.classList.add("is-loaded");
    });
});
