{ pkgs, ... }:

{
  packages = [
    pkgs.nodejs_22
    pkgs.web-ext
  ];

  git-hooks.hooks.hold-on-typecheck = {
    enable = true;
    name = "Hold On TypeScript check";
    entry = "npm run typecheck";
    language = "system";
    pass_filenames = false;
    stages = [ "pre-commit" ];
  };

  enterShell = ''
    echo "Hold On development environment ready"
    echo "Run: npm install && npm run check"
  '';
}
