let isBroadcasting = false;

module.exports = {
  get isBroadcasting() { return isBroadcasting; },
  set isBroadcasting(value) { isBroadcasting = value; }
};
