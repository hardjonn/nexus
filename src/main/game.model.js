import Ajv from 'ajv/dist/jtd';
const ajv = new Ajv();

const schema = {
  properties: {
    steam_app_id: {
      type: 'string',
    },
    steam_title: {
      type: 'string',
    },
    steam_exe_target: {
      type: 'string',
      nullable: true,
    },
    steam_start_dir: {
      type: 'string',
      nullable: true,
    },
    steam_launch_args: {
      type: 'string',
      nullable: true,
    },
    icon: {
      type: 'string',
      nullable: true,
    },
    version: {
      type: 'string',
      nullable: true,
    },
    description: {
      type: 'string',
      nullable: true,
    },
    game_location: {
      type: 'string',
      nullable: true,
    },
    prefix_location: {
      type: 'string',
      nullable: true,
    },
    launcher: {
      enum: ['NOOP', 'PORT_PROTON', 'PS2', 'PS3', 'SWITCH_CITRON', 'SWITCH_RYUJINX'],
    },
    launcher_target: {
      type: 'string',
      nullable: true,
    },
    game_hash: {
      type: 'string',
      nullable: true,
    },
    game_size_in_bytes: {
      type: 'int32',
    },
    prefix_hash: {
      type: 'string',
      nullable: true,
    },
    prefix_size_in_bytes: {
      type: 'int32',
    },
    status: {
      enum: ['DRAFT', 'UPLOADING', 'ACTIVE', 'INACTIVE', 'ARCHIVED'],
    },
  },
};

const dbModelValidator = ajv.compile(schema);
const dbModelSerializer = ajv.compileSerializer(schema);
const dbModelParser = ajv.compileParser(schema);

export { dbModelValidator, dbModelSerializer, dbModelParser };
