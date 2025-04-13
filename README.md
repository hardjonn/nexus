# nexus

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).


Title
    Ultimate Spider Man [PS2]
Location
    /home/deck/Games/Emulation/tools/launchers/pcsx2-qt.sh
WorkDir
    /home/deck/Games/Emulation/tools/launchers
Arguments
    -batch -fullscreen "'/home/deck/Games/Emulation/roms/ps2/ULTIMATE SPIDER MAN.ISO'"

Title
    Call of Duty 3 [PS3]
Location
    "/home/deck/Games/Emulation/tools/launchers/rpcs3.sh" --no-gui "'/path/to/disk'"
WorkDir
    /home/deck/Games/Emulation/tools/launchers
Arguments


Title
    01. Batman: Arkham Asylum 
Location
    "/home/deck/.var/app/ru.linux_gaming.PortProton/steam_scripts/Batman: Arkham Asylum.sh"
WorkDir
    "/home/deck/.var/app/ru.linux_gaming.PortProton/steam_scripts"
Arguments


DB Table Structure
    - steam_app_id
    - steam_title
    - steam_location
    - steam_work_dir
    - steam_launch_args
    - client_location (relative path Games/NFS/NFS Underground)
    - nas_location (relative path NFS/NFS Underground)
    - nas_hash_md5
    - nas_size_in_bytes

CREATE TABLE nexus.games (
	steam_app_id varchar(100) NOT NULL,
	steam_title varchar(255) NULL,
	steam_location varchar(255) NULL,
	steam_work_dir varchar(255) NULL,
	steam_launch_args varchar(255) NULL,
	client_location varchar(255) NULL,
	nas_location varchar(255) NULL,
	nas_hash_md5 varchar(255) NULL,
	nas_size_in_bytes INTEGER DEFAULT 0 NULL,
	CONSTRAINT games_pk PRIMARY KEY (steam_app_id)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE INDEX games_steam_title_IDX USING BTREE ON nexus.games (steam_title);



The Flow
1. NAS has a Gems Libs storage location
    nas://GameLibs/
        - Batman
        - Spider-Man
2. NAS has a sqlite3.db with a list of games
    nas://GameLibs/gamelib.db
3. App has the following options
    - resync local state
    - installing game
    - backup prefixes to the nas
4. Resync local state
    - get a list of games from the steam shortcuts.vdf
    - get the game title from the db
    - go over all the drives and check if the game is present somewhere
        - validate all the files
    - if not -- mark the steam shortcut with something like ❌ (add to the title)
5. Game installation
    - fetch all the games from the remote db (gameslib on nas)    
    - sync with local state and see what is installed and what not
    - for the not installed games provide an option to install/download the game
    - download game (rsync?)
    - when the games is fully downloaded - sync shortcut
        - add shortcut if not present
        - sync shortcut state (remove the ❌ sign from the title)


sudo apt-get install -y libmariadb-dev
python3 -m PyInstaller file.py



two tabs

Steam Local Games       |       Nexus Game Library
                        |
Title   | In Nexus?     |
Game 1  |   yes         |
Game 2  |   no          |

Games that are local but not in the Nexus can be created in Nexus and uploaded there






import os
import hashlib

def calculate_md5_of_file(file_path):
    """Calculate MD5 hash for a single file."""
    hash_md5 = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):  # Read in 4k chunks
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def calculate_md5_of_directory(directory_path):
    """Calculate MD5 hash for an entire directory recursively."""
    hash_md5 = hashlib.md5()

    # Walk through the directory
    for root, dirs, files in os.walk(directory_path):
        # Sort files to ensure consistent ordering (important for consistency)
        for file_name in sorted(files):
            file_path = os.path.join(root, file_name)
            # Add each file's hash to the directory hash
            file_hash = calculate_md5_of_file(file_path)
            hash_md5.update(file_hash.encode('utf-8'))
        
        # Optionally: include folder names and structure in the hash
        # Can be used if you need to ensure that file organization matters.
        dirs.sort()  # Sort directories to maintain order consistency

    return hash_md5.hexdigest()

# Example usage:
folder_path = 'path_to_your_folder'
folder_hash = calculate_md5_of_directory(folder_path)
print(f"The MD5 hash of the entire folder is: {folder_hash}")


#!/bin/bash

# Function to calculate MD5 hash of the entire folder recursively
calculate_md5_of_directory() {
  local dir="$1"

  # Find all files, sort them and calculate the MD5 hash of the content
  find "$dir" -type f -exec md5sum {} + | sort | md5sum | awk '{ print $1 }'
}

# Example usage
folder_path="path_to_your_folder"
folder_hash=$(calculate_md5_of_directory "$folder_path")

echo "The MD5 hash of the entire folder is: $folder_hash"
