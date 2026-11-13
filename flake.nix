{
  description = "Hold On Firefox extension development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    # Live Firefox sessions for the product-page captures.
    firefox-addon-live = {
      url = "github:mikenrafter/firefox-addon-live";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.flake-utils.follows = "flake-utils";
    };
  };

  outputs = { nixpkgs, flake-utils, firefox-addon-live, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        # Node, vanilla Firefox (FIREFOX_BINARY), Xvfb, ffmpeg, ImageMagick and
        # xdotool, web-ext, plus the .firefox-addon-live link the capture script uses.
        devShells.default = firefox-addon-live.lib.devShell {
          inherit pkgs;
          packages = [ pkgs.web-ext ];
          shellHook = ''
            echo "Hold On dev shell ready: npm install && npm run check"
            echo "Product-page captures: npm run capture:readme"
          '';
        };
      });
}
