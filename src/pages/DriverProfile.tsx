import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, Paper, Card, CardContent,
    List, ListItem, ListItemText, Divider, Chip, Button, CircularProgress, Avatar
import UserName from '../components/UserName';

// ...

// 4. Calculate Stats
const penalties = accusedProtests.filter(p =>
    p.status === 'accepted' || (p.status === 'concluded' && p.verdict === 'Punido')
).length;

// ...

            <Paper elevation={3} sx={{ p: 4, mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem' }}>
                    {driverName.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                    <Typography variant="h4">
                        <UserName uid={id || ''} variant="h4" />
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">ID: {id}</Typography>
                </Box>
            </Paper>

// ...

                                                <Typography component="span" variant="body2" color="text.primary">
                                                    Contra: <UserName uid={protest.accuserId === id ? protest.accusedId : protest.accuserId} />
                                                </Typography>
                                                <br />
{ new Date(protest.createdAt).toLocaleDateString() } - { protest.description.substring(0, 100) }...
                                            </>
                                        }
                                    />
                                </ListItem >
    { index<history.length - 1 && <Divider /> }
                            </div >
                        ))
                    )}
                </List >
            </Paper >
        </Container >
    );
}
